import { Bot, webhookCallback, type Context } from 'grammy';
import { logger } from '@pingo/shared';
import { helpMessage } from './templates.js';

export type TelegramHandlers = {
  connectAccount: (ctx: Context, token: string) => Promise<void>;
  status: (ctx: Context) => Promise<void>;
  list: (ctx: Context) => Promise<void>;
  add: (ctx: Context, url: string) => Promise<void>;
  resolveUser: (telegramUserId: string) => Promise<{ userId: string } | null>;
};

let bot: Bot | null = null;

export function getTelegramBot(handlers: TelegramHandlers): Bot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (bot) return bot;

  bot = new Bot(token);

  bot.command('start', async (ctx) => {
    const payload = ctx.match?.toString().trim();
    if (payload) {
      await handlers.connectAccount(ctx, payload);
      return;
    }
    const linked = ctx.from ? await handlers.resolveUser(String(ctx.from.id)) : null;
    if (linked) {
      await ctx.reply('PINGO is connected. Use /status to see your monitors.');
      return;
    }
    await ctx.reply(
      'Open the PINGO dashboard and click Connect Telegram to link this chat to your account.',
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(helpMessage());
  });

  bot.command('status', async (ctx) => {
    await handlers.status(ctx);
  });

  bot.command('list', async (ctx) => {
    await handlers.list(ctx);
  });

  bot.command('add', async (ctx) => {
    const url = ctx.match?.toString().trim();
    if (!url) {
      await ctx.reply('Usage: /add https://example.com');
      return;
    }
    await handlers.add(ctx, url);
  });

  bot.catch((error) => {
    logger.error({ err: error }, 'telegram bot error');
  });

  return bot;
}

export function createTelegramWebhookCallback(instance: Bot) {
  return webhookCallback(instance, 'std/http', {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
  });
}

export async function startTelegramPolling(instance: Bot) {
  logger.info('starting telegram polling for local development');
  await instance.start({
    onStart: () => logger.info('telegram polling started'),
  });
}
