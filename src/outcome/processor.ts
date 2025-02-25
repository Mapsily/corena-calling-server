import { Prisma, Conversation, Prospect } from '@prisma/client';
import config from '../config';
import { DateTime } from 'luxon';

const { db, logger } = config;

interface CallEvent {
  eventType: string;
  conversationId: string;
  callId: string;
  timestamp: string;
  duration?: number;
  transcript?: string;
  outcome?: {
    type: string; // e.g., 'APPOINTMENT_SET', 'CALLBACK_REQUESTED', 'NOT_INTERESTED', 'FAILED'
    appointmentTime?: string;
    callbackTime?: string;
    notes?: string;
  };
  failureReason?: string;
}

export async function processCallOutcome(event: CallEvent): Promise<void> {
  const { eventType, conversationId, timestamp, duration, transcript, outcome, failureReason } = event;

  try {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { prospect: true },
    });

    if (!conversation || !conversation.prospect) {
      logger.warn('Conversation or prospect not found', { conversationId });
      return;
    }

    const prospect = conversation.prospect;
    const eventTime = DateTime.fromISO(timestamp);

    switch (eventType) {
      case 'call.started':
        await db.conversation.update({
          where: { id: conversationId },
          data: { callStartAt: eventTime.toJSDate(), status: 'INPROGRESS' },
        });
        logger.info('Call started processed', { conversationId });
        break;

      case 'call.connected':
        // No specific action, just log for now
        logger.info('Call connected', { conversationId });
        break;

      case 'call.completed':
        if (!duration || !transcript || !outcome) {
          logger.warn('Missing data for completed call', { conversationId });
          break;
        }

        const resultMap: { [key: string]: string } = {
          'APPOINTMENT_SET': 'PASSED',
          'CALLBACK_REQUESTED': 'RESCHEDULED',
          'NOT_INTERESTED': 'FAILED',
          'FAILED': 'FAILED',
          'NO_RESPONSE': 'NOTRESPONDED',
        };
        const result = resultMap[outcome.type] || 'NOTRESPONDED';

        const prospectStatusMap: { [key: string]: string } = {
          'APPOINTMENT_SET': 'BOOKED',
          'CALLBACK_REQUESTED': 'RESCHEDULED',
          'NOT_INTERESTED': 'NOTINTERESTED',
          'FAILED': 'FAILED',
          'NO_RESPONSE': 'NOTRESPONDED',
        };
        const prospectStatus = prospectStatusMap[outcome.type] || 'NOTRESPONDED';

        await db.$transaction([
          db.conversation.update({
            where: { id: conversationId },
            data: {
              callEndAt: eventTime.toJSDate(),
              duration,
              transcript,
              result,
              status: 'COMPLETED',
              notes: outcome.notes || 'Call completed',
            },
          }),
          db.prospect.update({
            where: { id: prospect.id },
            data: {
              status: prospectStatus,
              lastContacted: eventTime.toJSDate(),
              ...(outcome.type === 'CALLBACK_REQUESTED' && outcome.callbackTime
                ? { rescheduledFor: DateTime.fromISO(outcome.callbackTime).toJSDate(), rescheduledCount: { increment: 1 } }
                : {}),
            },
          }),
          db.subscription.update({
            where: { userId: conversation.userId },
            data: {
              minutesLeft: { decrement: Math.ceil(duration / 60) },
              dailyUsed: { increment: 1 },
              lastUsedDate: eventTime.startOf('day').toJSDate(),
            },
          }),
          ...(outcome.type === 'APPOINTMENT_SET' && outcome.appointmentTime
            ? [db.appointment.create({
                data: {
                  prospectId: prospect.id,
                  scheduledFor: DateTime.fromISO(outcome.appointmentTime).toJSDate(),
                  productsInterest: [], // Placeholder, adjust as needed
                  interestLevel: 'MEDIUM', // Default
                  notes: outcome.notes || 'Appointment set from call',
                },
              })]
            : []),
        ]);

        logger.info('Call completed processed', { conversationId, outcome: outcome.type });
        break;

      case 'call.failed':
        await db.$transaction([
          db.conversation.update({
            where: { id: conversationId },
            data: {
              callEndAt: eventTime.toJSDate(),
              result: 'FAILED',
              status: 'COMPLETED',
              notes: `Failed: ${failureReason || 'Unknown reason'}`,
            },
          }),
          db.prospect.update({
            where: { id: prospect.id },
            data: { status: 'FAILED', lastContacted: eventTime.toJSDate() },
          }),
        ]);
        logger.info('Call failed processed', { conversationId, failureReason });
        break;

      default:
        logger.warn('Unknown event type', { eventType, conversationId });
    }
  } catch (err) {
    logger.error('Failed to process call outcome', { conversationId, error: (err as Error).message });
    throw err; // Re-throw for potential retry logic
  }
}