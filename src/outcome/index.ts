import { Express } from 'express';
import { setupWebhook } from './webhook';

export function setupWebhookRoute(app: Express): void {
  setupWebhook(app);
}