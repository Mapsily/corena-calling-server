import { processBatch } from "./batch";
import config from "../config";

const { logger } = config;

export async function startScheduler(): Promise<void> {
  logger.info("Scheduler started");
  await processBatch();
}
