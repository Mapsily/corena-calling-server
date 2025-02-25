import { Prospect } from "@prisma/client";
import config from "../config";
import { DateTime } from "luxon";

const { db, logger } = config;

export async function prioritizeProspects(
  userId: string,
  batchSize: number
): Promise<Prospect[]> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const now = DateTime.now();
      const prospects = await db.prospect.findMany({
        where: {
          userId,
          OR: [
            {
              status: { in: ["INITIAL", "NOTRESPONDED", "FAILED"] },
              lastContacted: { lt: now.minus({ hours: 24 }).toJSDate() },
            },
            {
              status: "RESCHEDULED",
              rescheduledFor: { lte: now.plus({ minutes: 30 }).toJSDate() },
            }, // Within next 30 min
          ],
        },
        orderBy: { updatedAt: "asc" },
        take: batchSize,
      });

      const prioritized = prospects.map((prospect) => {
        const lastContacted = prospect.lastContacted
          ? DateTime.fromJSDate(prospect.lastContacted)
          : now.minus({ days: 30 });
        const daysSinceLast = Math.floor(now.diff(lastContacted, "days").days);
        const score =
          daysSinceLast * 0.5 + (prospect.rescheduledCount || 0) * 2;
        const starvationBoost = daysSinceLast > 30 ? 10 : 0;
        return {
          ...prospect,
          priorityScore:
            prospect.status === "RESCHEDULED" ? 100 : score + starvationBoost,
        }; // RESCHEDULED highest
      });

      return prioritized
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, batchSize);
    } catch (err) {
      logger.warn(`Attempt ${attempt} failed for prospects`, {
        userId,
        error: (err as Error).message,
      });
      if (attempt === 3) {
        logger.error("All retries failed for prospects", {
          userId,
          error: (err as Error).message,
        });
        return [];
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return [];
}
