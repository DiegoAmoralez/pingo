import { NextResponse } from 'next/server';
import { prisma } from '@pingo/database';
import { getApiUser, jsonError } from '@/lib/api';
import { testNotificationKey } from '@pingo/monitoring';
import { enqueueNotification } from '@pingo/shared/jobs';

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    const connection = await prisma.telegramConnection.findUnique({ where: { userId: user.id } });
    if (!connection) {
      return NextResponse.json({ error: 'Telegram is not connected' }, { status: 400 });
    }
    const event = await prisma.notificationEvent.create({
      data: {
        userId: user.id,
        type: 'TEST',
        status: 'QUEUED',
        payload: { text: 'PINGO test notification. Your Telegram alerts are working.' },
        deduplicationKey: testNotificationKey(user.id, Date.now()),
      },
    });
    await enqueueNotification({ notificationEventId: event.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
