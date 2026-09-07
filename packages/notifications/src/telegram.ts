import { Bot } from 'grammy';
import { logger } from '@pingo/shared';

let sender: Bot | null = null;

function getSender(): Bot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (!sender) sender = new Bot(token);
  return sender;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const bot = getSender();
  if (!bot) {
    logger.warn('telegram send skipped: TELEGRAM_BOT_TOKEN is not set');
    throw new Error('Telegram is not configured');
  }
  await bot.api.sendMessage(chatId, text);
}

export function telegramDeepLink(token: string): string {
  const username = process.env.TELEGRAM_BOT_USERNAME || 'PingoMonitorBot';
  return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}
