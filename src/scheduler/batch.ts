import { DateTime } from "luxon";
import { prioritizeProspects } from "./prioritizer";
import config from "../config";

const { db, queue, logger } = config;

interface CallJobData {
  userId: string;
  prospectId: string;
  script: string;
  agentSettings: { language: string; voice: string; firstMessage: string };
  scheduledTime: string;
  variables: Record<string, string>;
}

export async function processBatch(): Promise<void> {
  const batchSize = Number(process.env.BATCH_SIZE) || 50;
  let processedUsers = 0;
  let queuedJobs = 0;

  try {
    const users = await db.user.findMany({
      where: { subscription: { status: "ACTIVE" } },
      include: {
        setting: {
          include: {
            advancedSetting: true,
            scriptSetting: true,
            agentSetting: true,
          },
        },
        subscription: { include: { plan: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: batchSize,
    });

    for (const user of users) {
      if (
        !user.setting?.advancedSetting ||
        !user.setting.scriptSetting ||
        !user.setting.agentSetting
      ) {
        logger.info("Skipping user: missing settings", { userId: user.id });
        continue;
      }

      const { timeZone, startAt, endAt } = user.setting.advancedSetting;
      const tz = DateTime.local().setZone(timeZone).isValid ? timeZone : "UTC";
      const now = DateTime.now().setZone(tz);
      const start = DateTime.fromJSDate(startAt).setZone(tz);
      const end = DateTime.fromJSDate(endAt).setZone(tz);

      if (!start.isValid || !end.isValid || start >= end) {
        logger.info("Skipping user: invalid start/end times", {
          userId: user.id,
        });
        continue;
      }
      if (now < start || now >= end) {
        logger.info("Skipping user: outside calling window", {
          userId: user.id,
        });
        continue;
      }

      const dailyLimit = user.subscription?.plan.perDay || 0;
      const dailyUsed = user.subscription?.dailyUsed || 0;
      const minutesLeft = user.subscription?.minutesLeft || 0;
      const callsLeft = Math.min(dailyLimit - dailyUsed, 10);
      if (callsLeft <= 0 || minutesLeft <= 0) {
        logger.info("Skipping user: no calls or minutes left", {
          userId: user.id,
          callsLeft,
          minutesLeft,
        });
        continue;
      }

      const prospects = await prioritizeProspects(user.id, callsLeft);
      if (prospects.length === 0) {
        logger.info("Skipping user: no eligible prospects", {
          userId: user.id,
        });
        continue;
      }

      const intervalMs = (30 * 60 * 1000) / prospects.length;
      const nowMs = Date.now();

      for (let i = 0; i < prospects.length; i++) {
        const prospect = prospects[i];
        let scheduledTime: string;

        if (prospect.status === "RESCHEDULED" && prospect.rescheduledFor) {
          const rescheduledDt = DateTime.fromJSDate(prospect.rescheduledFor);
          if (rescheduledDt.isValid) {
            scheduledTime = rescheduledDt.toISO();
          } else {
            logger.warn("Invalid rescheduledFor, using batch time", {
              userId: user.id,
              prospectId: prospect.id,
            });
            scheduledTime = new Date(nowMs + i * intervalMs).toISOString();
          }
        } else {
          scheduledTime = new Date(nowMs + i * intervalMs).toISOString();
        }

        const jobData: CallJobData = {
          userId: user.id,
          prospectId: prospect.id,
          script:
            prospect.status === "RESCHEDULED" &&
            prospect.rescheduledCount &&
            prospect.rescheduledCount > 0
              ? user.setting.scriptSetting.followUp ||
                "Hi, calling back as requested."
              : user.setting.scriptSetting.initial ||
                "Hello, this is a test call.",
          agentSettings: {
            language: user.setting.agentSetting.language || "en",
            voice: user.setting.agentSetting.voice || "female",
            firstMessage:
              user.setting.agentSetting.firstMessage || `Hi ${prospect.name}`,
          },
          scheduledTime,
          variables: { prospectName: prospect.name },
        };

        try {
          await queue.add("scheduled-calls", jobData, {
            delay: Math.max(0, new Date(scheduledTime).getTime() - Date.now()),
            attempts: 3,
            backoff: { type: "exponential", delay: 60000 },
          });
          queuedJobs++;
          logger.info("Scheduled call", {
            userId: user.id,
            prospectId: prospect.id,
            scheduledTime,
          });
        } catch (err) {
          logger.error("Failed to queue job", {
            userId: user.id,
            prospectId: prospect.id,
            error: (err as Error).message,
          });
        }
      }

      await db.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() },
      });
      processedUsers++;
    }

    logger.info("Batch completed", { processedUsers, queuedJobs });
  } catch (err) {
    logger.error("Batch processing error", { error: (err as Error).message });
  }
}
