import { prisma } from '@pingo/database';
import type { NotificationType } from '@pingo/database';
import { enqueueNotification } from '@pingo/shared/jobs';

/**
 * Records a notification event and hands it to the worker for delivery.
 * The deduplication key makes retries and repeated checks idempotent: a
 * duplicate key is silently ignored instead of sending the alert twice.
 *
 * Returns true when a new event was queued, false when it was a duplicate.
 */
export async function queueAlert(input: {
  userId: string;
  monitorId?: string;
  type: NotificationType;
  deduplicationKey: string;
  text: string;
}): Promise<boolean> {
  try {
    const event = await prisma.notificationEvent.create({
      data: {
        userId: input.userId,
        monitorId: input.monitorId,
        type: input.type,
        status: 'QUEUED',
        payload: { text: input.text },
        deduplicationKey: input.deduplicationKey,
      },
    });
    await enqueueNotification({ notificationEventId: event.id });
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}
