import { logger } from '@pingo/shared';
import { getPingoBot, startPingoPolling } from '@pingo/telegram-bot';

/**
 * Runs the PingoGo Telegram bot inside the worker.
 *
 * - Local development (or no webhook secret): long polling.
 * - Production with TELEGRAM_WEBHOOK_SECRET: updates arrive through the web
 *   app at /api/webhooks/telegram, so the worker only sends alerts.
 */
export async function startTelegramRuntime() {
  const bot = getPingoBot();
  if (!bot) {
    logger.info('telegram bot disabled: TELEGRAM_BOT_TOKEN is not set');
    return;
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (process.env.NODE_ENV !== 'production' || !webhookSecret) {
    // Polling blocks until the bot stops; run it detached so the worker keeps booting.
    startPingoPolling(bot).catch((error) => {
      logger.error({ err: error }, 'telegram polling stopped');
    });
    return;
  }

  logger.info('telegram bot uses webhook mode; polling skipped');
}

export async function stopTelegramRuntime() {
  const bot = getPingoBot();
  if (!bot) return;
  await bot.stop().catch(() => undefined);
}
