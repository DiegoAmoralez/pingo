import { prisma } from '@pingo/database';
import { sendTelegramMessage } from '@pingo/notifications';
import { childLogger, type SendNotificationJob } from '@pingo/shared';
import { alertKeyboard, dictionary, toBotLocale } from '@pingo/telegram-bot';

const log = childLogger({ job: 'send-notification' });

function isPermanentTelegramError(error: unknown): boolean {
  const code = (error as { error_code?: number } | null)?.error_code;
  return code === 400 || code === 403;
}

export async function processNotification(data: SendNotificationJob) {
  const event = await prisma.notificationEvent.findUnique({
    where: { id: data.notificationEventId },
    include: { user: { include: { telegram: true } } },
  });
  if (!event) return;
  if (event.status === 'SENT') return;

  const connection = event.user.telegram;
  const chatId = connection?.telegramChatId;
  if (!chatId) {
    await prisma.notificationEvent.update({
      where: { id: event.id },
      data: { status: 'FAILED' },
    });
    log.warn({ eventId: event.id }, 'telegram not connected');
    return;
  }

  const text =
    typeof event.payload === 'object' && event.payload && 'text' in event.payload
      ? String((event.payload as { text: string }).text)
      : 'PingoGo notification';

  // Alerts about a specific site get a button that opens its card in the bot.
  const replyMarkup =
    event.monitorId && event.type !== 'TEST'
      ? alertKeyboard(dictionary(toBotLocale(connection?.locale)), event.monitorId)
      : undefined;

  try {
    await sendTelegramMessage(chatId, text, { replyMarkup });
  } catch (error) {
    // 400 "chat not found" / 403 "bot was blocked" never succeed on retry.
    if (isPermanentTelegramError(error)) {
      await prisma.notificationEvent.update({ where: { id: event.id }, data: { status: 'FAILED' } });
      log.warn({ eventId: event.id, chatId, err: error }, 'telegram rejected the chat; marked FAILED');
      return;
    }
    throw error;
  }
  await prisma.notificationEvent.update({
    where: { id: event.id },
    data: { status: 'SENT', sentAt: new Date() },
  });
  log.info({ eventId: event.id, type: event.type }, 'telegram notification sent');
}
