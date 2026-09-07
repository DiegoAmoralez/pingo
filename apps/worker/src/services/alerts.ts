import { prisma } from '@pingo/database';
import { enqueueNotification } from '@pingo/shared/jobs';
import type { NotificationType } from '@pingo/database';

export async function queueAlert(input: {
  userId: string;
  monitorId?: string;
  type: NotificationType;
  deduplicationKey: string;
  text: string;
}) {
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
  } catch (error) {
    if (isUniqueViolation(error)) return;
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
