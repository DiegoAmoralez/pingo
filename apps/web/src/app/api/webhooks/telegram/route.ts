import { createPingoWebhookCallback, getPingoBot } from '@pingo/telegram-bot';

export const runtime = 'nodejs';

/**
 * Production entry point for Telegram updates. The same bot (menus, commands,
 * callbacks) is shared with the worker, which runs it via polling in development.
 */
export async function POST(request: Request) {
  const bot = getPingoBot();
  if (!bot) {
    return new Response('Telegram is not configured', { status: 503 });
  }
  const callback = createPingoWebhookCallback(bot);
  return callback(request);
}
