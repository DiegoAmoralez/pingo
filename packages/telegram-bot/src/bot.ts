import { Bot, webhookCallback } from 'grammy';
import { logger } from '@pingo/shared';
import { CB, idFrom } from './callbacks.js';
import { botCommands } from './i18n.js';
import { looksLikeUrl } from './format.js';
import * as h from './handlers.js';
import { loadSession, type BotContext } from './session.js';
import { getPending } from './state.js';

let instance: Bot<BotContext> | null = null;

/**
 * Builds (once) the PingoGo Telegram bot. Returns null when the token is not
 * configured so callers can degrade gracefully.
 */
export function getPingoBot(): Bot<BotContext> | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (instance) return instance;

  const bot = new Bot<BotContext>(token);

  bot.use(async (ctx, next) => {
    ctx.session = await loadSession(ctx);
    await next();
  });

  registerCommands(bot);
  registerCallbacks(bot);
  registerMessages(bot);

  bot.catch(async (error) => {
    logger.error({ err: error.error, update: error.ctx.update.update_id }, 'telegram bot error');
    const ctx = error.ctx;
    try {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: ctx.session?.t.genericError ?? 'Error' });
      } else {
        await ctx.reply(ctx.session?.t.genericError ?? 'Something went wrong. Please try again.');
      }
    } catch {
      // Best effort only.
    }
  });

  instance = bot;
  return bot;
}

function registerCommands(bot: Bot<BotContext>) {
  bot.command('start', (ctx) => h.handleStart(ctx, ctx.match?.toString().trim() || undefined));
  bot.command('menu', (ctx) => h.showMenu(ctx));
  bot.command(['sites', 'status', 'list'], (ctx) => h.showSites(ctx));
  bot.command('add', async (ctx) => {
    const url = ctx.match?.toString().trim();
    if (url) {
      await h.addSite(ctx, url);
      return;
    }
    await h.startAddSite(ctx);
  });
  bot.command('incidents', (ctx) => h.showIncidents(ctx));
  bot.command(['settings', 'notifications'], (ctx) => h.showNotifications(ctx));
  bot.command(['plan', 'billing'], (ctx) => h.showPlan(ctx));
  bot.command('account', (ctx) => h.showAccount(ctx));
  bot.command(['language', 'lang'], (ctx) => h.showLanguage(ctx));
  bot.command('help', (ctx) => h.showHelp(ctx));
  bot.command('cancel', (ctx) => h.cancelPending(ctx));
}

function registerCallbacks(bot: Bot<BotContext>) {
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Exact matches first.
    switch (data) {
      case CB.menu:
        return h.showMenu(ctx);
      case CB.sites:
        return h.showSites(ctx);
      case CB.add:
        return h.startAddSite(ctx);
      case CB.cancel:
        return h.cancelPending(ctx);
      case CB.incidents:
        return h.showIncidents(ctx);
      case CB.notifications:
        return h.showNotifications(ctx);
      case CB.notificationTest:
        return h.sendTestNotification(ctx);
      case CB.plan:
        return h.showPlan(ctx);
      case CB.portal:
        return h.openBillingPortal(ctx);
      case CB.account:
        return h.showAccount(ctx);
      case CB.disconnectAsk:
        return h.askDisconnect(ctx);
      case CB.disconnectConfirm:
        return h.confirmDisconnect(ctx);
      case CB.language:
        return h.showLanguage(ctx);
      case CB.help:
        return h.showHelp(ctx);
      case CB.noop:
        return ctx.answerCallbackQuery();
    }

    // Prefixed actions carrying an id. Longer prefixes are checked first so
    // "dd:" does not get swallowed by "d:".
    if (data.startsWith(CB.deleteConfirm)) return h.confirmDeleteSite(ctx, idFrom(CB.deleteConfirm, data));
    if (data.startsWith(CB.deleteAsk)) return h.askDeleteSite(ctx, idFrom(CB.deleteAsk, data));
    if (data.startsWith(CB.site)) return h.showSite(ctx, idFrom(CB.site, data));
    if (data.startsWith(CB.check)) return h.checkSiteNow(ctx, idFrom(CB.check, data));
    if (data.startsWith(CB.pauseToggle)) return h.togglePause(ctx, idFrom(CB.pauseToggle, data));
    if (data.startsWith(CB.siteIncidents)) return h.showIncidents(ctx, idFrom(CB.siteIncidents, data));
    if (data.startsWith(CB.notificationToggle)) return h.toggleNotification(ctx, idFrom(CB.notificationToggle, data));
    if (data.startsWith(CB.checkout)) return h.startCheckout(ctx, idFrom(CB.checkout, data));
    if (data.startsWith(CB.setLanguage)) return h.setLanguage(ctx, idFrom(CB.setLanguage, data));

    await ctx.answerCallbackQuery();
  });
}

function registerMessages(bot: Bot<BotContext>) {
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();
    const telegramUserId = ctx.session.telegramUserId;
    const pending = telegramUserId ? await getPending(telegramUserId) : null;

    if (pending?.kind === 'add_url' || looksLikeUrl(text)) {
      await h.addSite(ctx, text);
      return;
    }
    await h.showMenu(ctx);
  });
}

export function createPingoWebhookCallback(bot: Bot<BotContext>) {
  return webhookCallback(bot, 'std/http', {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
  });
}

export async function registerBotCommands(bot: Bot<BotContext>) {
  await bot.api.setMyCommands(botCommands.en);
  await bot.api.setMyCommands(botCommands.ru, { language_code: 'ru' });
}

export async function startPingoPolling(bot: Bot<BotContext>) {
  await registerBotCommands(bot).catch((error) =>
    logger.warn({ err: error }, 'could not register telegram commands'),
  );
  logger.info('starting telegram polling for local development');
  await bot.start({
    drop_pending_updates: false,
    onStart: (me) => logger.info({ username: me.username }, 'telegram polling started'),
  });
}
