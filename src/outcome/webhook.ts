import { Express, Request, Response } from 'express';
import config from '../config';
import { processCallOutcome } from './processor';

const { logger } = config;
 
export function setupWebhook(app: Express): void {
  app.post('/webhooks/outcome', async (req: Request, res: Response) => {
    const conversationId = req.query.conversationId as string;
    const event = req.body;

    if (!conversationId || !event.eventType) {
      logger.warn('Invalid webhook payload', { query: req.query, body: req.body });
      return res.status(400).json({ error: 'Missing conversationId or eventType' });
    }

    try {
      await processCallOutcome({ ...event, conversationId });
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error('Webhook processing failed', { conversationId, error: (err as Error).message });
      res.status(200).json({ received: true }); // Always 200 to prevent retries
    }
  });

  logger.info('Webhook endpoint setup at /webhooks/outcome');
}