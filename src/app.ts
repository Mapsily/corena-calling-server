import "dotenv/config";
import express, { Express, Request, Response, NextFunction } from "express";
import cron from "node-cron";

import config from "./config";
import { startScheduler } from "./scheduler";
import { startWorker } from "./executor";
import { setupWebhookRoute } from "./outcome";

const { db, queue, logger } = config;
const app: Express = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
setupWebhookRoute(app);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

cron.schedule(`*/${process.env.SCHEDULE_INTERVAL} * * * *`, () => {
  logger.info("Starting batch scheduling");
  startScheduler().catch((err) =>
    logger.error("Scheduler error", { error: err.message })
  );
});

startWorker();

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

async function checkDependencies(): Promise<void> {
  await db.$connect();
  (await queue.client).ping();
}

app.listen(PORT, async () => {
  try {
    await checkDependencies();
    logger.info(`Server started on port ${PORT}`);
  } catch (err) {
    logger.error("Startup failed", { error: (err as Error).message });
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down service");
  await db.$disconnect();
  await queue.close();
  process.exit(0);
});
