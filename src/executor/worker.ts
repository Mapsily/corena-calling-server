import { Worker, Job } from "bullmq";
import config from "../config";
import ultravoxService from "./ultravox";
import { DateTime } from "luxon";

const { db, logger } = config;

interface CallJobData {
  userId: string;
  prospectId: string;
  script: string;
  agentSettings: { language: string; voice: string; firstMessage: string };
  scheduledTime: string;
  variables: Record<string, string>;
}

const callWorker = new Worker(
  "scheduled-calls",
  async (job: Job<CallJobData>) => {
    const {
      userId,
      prospectId,
      script,
      agentSettings,
      scheduledTime,
      variables,
    } = job.data;
    logger.info("Processing call job", { jobId: job.id, userId, prospectId });

    try {
      // Fetch prospect and user data
      const [prospect, user] = await Promise.all([
        db.prospect.findUnique({ where: { id: prospectId } }),
        db.user.findUnique({
          where: { id: userId },
          include: { subscription: true },
        }),
      ]);

      if (!prospect || !user) {
        throw new Error(`Missing data: prospect=${!!prospect}, user=${!!user}`);
      }

      if (!prospect.phone) {
        throw new Error("Prospect phone number missing");
      }

      if (!user.subscription || user.subscription?.minutesLeft <= 0) {
        throw new Error("No minutes left in subscription");
      }

      // Create conversation record
      const conversation = await db.conversation.create({
        data: {
          prospectId,
          transcript: "",
          callStartAt: DateTime.now().toJSDate(),
          callEndAt: DateTime.now().toJSDate(), // Placeholder, updated later
          notes: "Call initiated",
          result: "NOTRESPONDED", // Default, updated by outcome
          status: "INPROGRESS",
        },
      });

      // Initiate call via Ultravox
      const callResult = await ultravoxService.initiateCall(
        prospect.phone,
        script,
        variables,
        `${process.env.SERVICE_URL}/webhooks/outcome?conversationId=${conversation.id}`,
        agentSettings.voice,
        agentSettings.language,
        agentSettings.firstMessage
      );

      // Update conversation with external call ID
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          status: "COMPLETED",
        },
      });

      logger.info("Call execution completed", {
        jobId: job.id,
        conversationId: conversation.id,
      });
      return { success: true, conversationId: conversation.id };
    } catch (err) {
      logger.error("Call execution failed", {
        jobId: job.id,
        userId,
        prospectId,
        error: (err as Error).message,
      });
      throw err; // Triggers BullMQ retry
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    },
    concurrency: 5, // Process 5 calls concurrently
  }
);

// Event handlers
callWorker.on("completed", (job) => {
  logger.info("Job completed", { jobId: job.id });
});

callWorker.on("failed", (job, err) => {
  logger.error("Job failed", { jobId: job?.id, error: err.message });
});

export default callWorker;
