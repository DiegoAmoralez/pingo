import { createHash } from 'node:crypto';
import { prisma } from '@pingo/database';
import {
  createMonitor,
  deleteMonitor,
  getMonitorForUser,
  getMonitorUptime,
  getNotificationPreferences,
  listIncidents,
  listMonitors,
  requestManualCheck,
  toggleNotificationPreference,
  updateMonitor,
  type NotificationPreferenceKey,
} from '@pingo/core';
import { getBillingProvider } from '@pingo/billing';
import { testNotificationKey } from '@pingo/monitoring';
import { AppError, RateLimitError, logger, trackEvent, type PlanCode } from '@pingo/shared';
import { enqueueNotification } from '@pingo/shared/jobs';
import { dictionary, toBotLocale, type BotLocale } from './i18n.js';
import { escapeHtml } from './format.js';
import {
  PREFERENCE_KEYS,
  accountKeyboard,
  addKeyboard,
  appUrl,
  backKeyboard,
  checkoutKeyboard,
  confirmDeleteKeyboard,
  confirmDisconnectKeyboard,
  incidentsKeyboard,
  languageKeyboard,
  mainMenuKeyboard,
  notLinkedKeyboard,
  notificationsKeyboard,
  planKeyboard,
  siteKeyboard,
  sitesKeyboard,
} from './keyboards.js';
import { acknowledge, showScreen } from './reply.js';
import type { BotContext, LinkedSession } from './session.js';
import { clearPending, setGuestLocale, setPending } from './state.js';
import {
  renderAccount,
  renderAdd,
  renderConfirmDelete,
  renderConfirmDisconnect,
  renderHelp,
  renderIncidents,
  renderLanguage,
  renderLinked,
  renderMenu,
  renderNotLinked,
  renderNotifications,
  renderPlan,
  renderSite,
  renderSites,
  siteButtonLabel,
  upgradeOptions,
  type ViewContext,
} from './views.js';

function view(ctx: BotContext): ViewContext {
  return { t: ctx.session.t, locale: ctx.session.locale, timeZone: ctx.session.timeZone };
}

/** Returns the linked session or shows the onboarding screen and returns null. */
async function requireLinked(ctx: BotContext): Promise<LinkedSession | null> {
  if (ctx.session.linked) return ctx.session;
  await acknowledge(ctx);
  await showScreen(ctx, renderNotLinked(view(ctx)), notLinkedKeyboard(ctx.session.t));
  return null;
}

function errorText(ctx: BotContext, error: unknown): string {
  const { t } = ctx.session;
  if (error instanceof RateLimitError) return t.rateLimited;
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return t.genericError;
}

// ---------------------------------------------------------------------------
// Onboarding / account linking
// ---------------------------------------------------------------------------

export async function handleStart(ctx: BotContext, payload: string | undefined) {
  if (payload) {
    await connectAccount(ctx, payload);
    return;
  }
  await showMenu(ctx);
}

async function connectAccount(ctx: BotContext, token: string) {
  const { t } = ctx.session;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const record = await prisma.telegramConnectToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { monitors: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    await showScreen(ctx, escapeHtml(t.linkInvalid), notLinkedKeyboard(t));
    return;
  }
  if (!ctx.from || !ctx.chat) {
    await ctx.reply(t.cannotIdentify);
    return;
  }

  const locale: BotLocale = ctx.session.locale;
  await prisma.$transaction([
    prisma.telegramConnectToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // One Telegram belongs to one account: drop a stale link to a different account first.
    prisma.telegramConnection.deleteMany({
      where: { telegramUserId: String(ctx.from.id), userId: { not: record.userId } },
    }),
    prisma.telegramConnection.upsert({
      where: { userId: record.userId },
      create: {
        userId: record.userId,
        telegramUserId: String(ctx.from.id),
        telegramChatId: String(ctx.chat.id),
        username: ctx.from.username ?? null,
        locale,
      },
      update: {
        telegramUserId: String(ctx.from.id),
        telegramChatId: String(ctx.chat.id),
        username: ctx.from.username ?? null,
        locale,
        connectedAt: new Date(),
      },
    }),
  ]);
  await trackEvent('telegram_connected', { source: 'bot' }, record.userId);

  const hostnames = record.user.monitors.map((m) => m.displayHostname);
  await showScreen(ctx, renderLinked(view(ctx), hostnames), mainMenuKeyboard(t));
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export async function showMenu(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await acknowledge(ctx);
  await clearPending(session.telegramUserId);
  const monitors = await prisma.monitor.findMany({
    where: { userId: session.user.id },
    select: { status: true, pausedAt: true },
  });
  await showScreen(
    ctx,
    renderMenu(view(ctx), { name: session.user.name, monitors, plan: session.plan }),
    mainMenuKeyboard(session.t),
  );
}

export async function showHelp(ctx: BotContext) {
  await acknowledge(ctx);
  const keyboard = ctx.session.linked ? backKeyboard(ctx.session.t) : notLinkedKeyboard(ctx.session.t);
  await showScreen(ctx, renderHelp(view(ctx)), keyboard);
}

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------

export async function showSites(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await acknowledge(ctx);
  const monitors = await listMonitors(session.user.id);
  const buttons = monitors.map((m) => ({ id: m.id, label: siteButtonLabel(m) }));
  await showScreen(ctx, renderSites(view(ctx), monitors), sitesKeyboard(session.t, buttons));
}

export async function showSite(ctx: BotContext, monitorId: string, toast?: string) {
  const session = await requireLinked(ctx);
  if (!session) return;
  try {
    const [monitor, uptime] = await Promise.all([
      getMonitorForUser(session.user.id, monitorId),
      getMonitorUptime(monitorId),
    ]);
    await acknowledge(ctx, toast);
    await showScreen(
      ctx,
      renderSite(view(ctx), { monitor, uptime }),
      siteKeyboard(session.t, { id: monitor.id, url: monitor.url, paused: Boolean(monitor.pausedAt) }),
    );
  } catch (error) {
    if (error instanceof AppError && (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN')) {
      await acknowledge(ctx, session.t.siteNotFound);
      await showSites(ctx);
      return;
    }
    throw error;
  }
}

export async function checkSiteNow(ctx: BotContext, monitorId: string) {
  const session = await requireLinked(ctx);
  if (!session) return;
  try {
    await requestManualCheck(session.user.id, monitorId);
    await showSite(ctx, monitorId, session.t.checkQueued);
  } catch (error) {
    await showSite(ctx, monitorId, errorText(ctx, error));
  }
}

export async function togglePause(ctx: BotContext, monitorId: string) {
  const session = await requireLinked(ctx);
  if (!session) return;
  try {
    const monitor = await getMonitorForUser(session.user.id, monitorId);
    const paused = !monitor.pausedAt;
    await updateMonitor(session.user.id, monitorId, { paused });
    await showSite(ctx, monitorId, paused ? session.t.paused : session.t.resumed);
  } catch (error) {
    await showSite(ctx, monitorId, errorText(ctx, error));
  }
}

export async function askDeleteSite(ctx: BotContext, monitorId: string) {
  const session = await requireLinked(ctx);
  if (!session) return;
  const monitor = await getMonitorForUser(session.user.id, monitorId);
  await acknowledge(ctx);
  await showScreen(
    ctx,
    renderConfirmDelete(view(ctx), monitor.displayHostname),
    confirmDeleteKeyboard(session.t, monitorId),
  );
}

export async function confirmDeleteSite(ctx: BotContext, monitorId: string) {
  const session = await requireLinked(ctx);
  if (!session) return;
  const monitor = await getMonitorForUser(session.user.id, monitorId);
  await deleteMonitor(session.user.id, monitorId);
  await trackEvent('monitor_deleted', { source: 'bot' }, session.user.id);
  await acknowledge(ctx, session.t.deleted(monitor.displayHostname));
  await showSites(ctx);
}

// ---------------------------------------------------------------------------
// Add site
// ---------------------------------------------------------------------------

export async function startAddSite(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await acknowledge(ctx);
  await setPending(session.telegramUserId, { kind: 'add_url' });
  await showScreen(ctx, renderAdd(view(ctx)), addKeyboard(session.t));
}

export async function addSite(ctx: BotContext, url: string) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await clearPending(session.telegramUserId);
  try {
    const monitor = await createMonitor(session.user.id, {
      url,
      timeoutSeconds: 10,
      expectedStatusCodes: '200-399',
    });
    await ctx.reply(session.t.added(monitor.displayHostname));
    await showSite(ctx, monitor.id);
  } catch (error) {
    const reason = errorText(ctx, error);
    await ctx.reply(`${session.t.addFailed}\n${reason}`, { reply_markup: addKeyboard(session.t) });
    await setPending(session.telegramUserId, { kind: 'add_url' });
  }
}

export async function cancelPending(ctx: BotContext) {
  if (ctx.session.telegramUserId) await clearPending(ctx.session.telegramUserId);
  await acknowledge(ctx, ctx.session.t.cancelled);
  await showMenu(ctx);
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export async function showIncidents(ctx: BotContext, monitorId?: string) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await acknowledge(ctx);
  let hostname: string | undefined;
  if (monitorId) {
    hostname = (await getMonitorForUser(session.user.id, monitorId)).displayHostname;
  }
  const incidents = await listIncidents(session.user.id, { monitorId, take: 10 });
  await showScreen(
    ctx,
    renderIncidents(view(ctx), { incidents, hostname }),
    incidentsKeyboard(session.t, monitorId),
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function showNotifications(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await acknowledge(ctx);
  const prefs = await getNotificationPreferences(session.user.id);
  await showScreen(ctx, renderNotifications(view(ctx), prefs), notificationsKeyboard(session.t, prefs));
}

export async function toggleNotification(ctx: BotContext, key: string) {
  const session = await requireLinked(ctx);
  if (!session) return;
  if (!PREFERENCE_KEYS.includes(key as NotificationPreferenceKey)) {
    await showNotifications(ctx);
    return;
  }
  const prefs = await toggleNotificationPreference(session.user.id, key as NotificationPreferenceKey);
  await acknowledge(ctx);
  await showScreen(ctx, renderNotifications(view(ctx), prefs), notificationsKeyboard(session.t, prefs));
}

export async function sendTestNotification(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  const event = await prisma.notificationEvent.create({
    data: {
      userId: session.user.id,
      type: 'TEST',
      status: 'QUEUED',
      payload: { text: session.t.testAlert },
      deduplicationKey: testNotificationKey(session.user.id, Date.now()),
    },
  });
  await enqueueNotification({ notificationEventId: event.id });
  await acknowledge(ctx, '📨');
}

// ---------------------------------------------------------------------------
// Plan & billing
// ---------------------------------------------------------------------------

export async function showPlan(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await acknowledge(ctx);
  const activeMonitors = await prisma.monitor.count({
    where: { userId: session.user.id, pausedAt: null },
  });
  const billing = getBillingProvider();
  await showScreen(
    ctx,
    renderPlan(view(ctx), { plan: session.plan, activeMonitors, subscription: session.user.subscription }),
    planKeyboard(session.t, {
      upgrades: upgradeOptions(session.plan),
      billingConfigured: Boolean(billing),
      hasCustomer: Boolean(session.user.subscription?.providerCustomerId),
    }),
  );
}

export async function startCheckout(ctx: BotContext, planCode: string) {
  const session = await requireLinked(ctx);
  if (!session) return;
  const billing = getBillingProvider();
  const plan = planCode as PlanCode;
  if (!billing || plan === 'FREE' || !['PERSONAL', 'PRO', 'AGENCY'].includes(plan)) {
    await acknowledge(ctx, session.t.billingUnavailable);
    return;
  }
  try {
    const checkout = await billing.createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      plan,
      customerId: session.user.subscription?.providerCustomerId,
      successUrl: appUrl('/settings?tab=billing'),
      cancelUrl: appUrl('/settings?tab=billing'),
    });
    await trackEvent('checkout_started', { plan, source: 'bot' }, session.user.id);
    await acknowledge(ctx);
    const name = upgradeOptions('FREE').find((p) => p.code === plan)?.name ?? plan;
    await showScreen(ctx, escapeHtml(session.t.checkoutReady(name)), checkoutKeyboard(session.t, checkout.url));
  } catch (error) {
    logger.error({ err: error }, 'telegram checkout failed');
    await acknowledge(ctx, errorText(ctx, error));
  }
}

export async function openBillingPortal(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  const billing = getBillingProvider();
  const customerId = session.user.subscription?.providerCustomerId;
  if (!billing || !customerId) {
    await acknowledge(ctx, session.t.billingUnavailable);
    return;
  }
  try {
    const portal = await billing.createPortalSession({ customerId, returnUrl: appUrl('/settings?tab=billing') });
    await acknowledge(ctx);
    await showScreen(ctx, escapeHtml(session.t.manageBilling), checkoutKeyboard(session.t, portal.url));
  } catch (error) {
    logger.error({ err: error }, 'telegram portal failed');
    await acknowledge(ctx, errorText(ctx, error));
  }
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function showAccount(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await acknowledge(ctx);
  await showScreen(
    ctx,
    renderAccount(view(ctx), { user: session.user, connection: session.connection }),
    accountKeyboard(session.t),
  );
}

export async function askDisconnect(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await acknowledge(ctx);
  await showScreen(ctx, renderConfirmDisconnect(view(ctx)), confirmDisconnectKeyboard(session.t));
}

export async function confirmDisconnect(ctx: BotContext) {
  const session = await requireLinked(ctx);
  if (!session) return;
  await prisma.telegramConnection.deleteMany({ where: { userId: session.user.id } });
  await setGuestLocale(session.telegramUserId, session.locale);
  await trackEvent('telegram_disconnected', { source: 'bot' }, session.user.id);
  await acknowledge(ctx);
  await showScreen(ctx, escapeHtml(session.t.disconnected), notLinkedKeyboard(session.t));
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

export async function showLanguage(ctx: BotContext) {
  await acknowledge(ctx);
  await showScreen(
    ctx,
    renderLanguage(view(ctx)),
    languageKeyboard(ctx.session.t, ctx.session.locale, ctx.session.linked),
  );
}

export async function setLanguage(ctx: BotContext, value: string) {
  const locale = toBotLocale(value);
  if (ctx.session.linked) {
    await prisma.telegramConnection.update({
      where: { id: ctx.session.connection.id },
      data: { locale },
    });
  } else if (ctx.session.telegramUserId) {
    await setGuestLocale(ctx.session.telegramUserId, locale);
  }
  // Re-render with the new dictionary without waiting for the next update.
  ctx.session = { ...ctx.session, locale, t: dictionary(locale) };
  await acknowledge(ctx, ctx.session.t.languageSet);
  if (ctx.session.linked) {
    await showMenu(ctx);
  } else {
    await showScreen(ctx, renderNotLinked(view(ctx)), notLinkedKeyboard(ctx.session.t));
  }
}
