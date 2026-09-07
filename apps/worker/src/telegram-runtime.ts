import { prisma } from '@pingo/database';
import { assertCanCreateMonitor, clampCheckInterval, normalizeMonitorUrl } from '@pingo/monitoring';
import {
  getTelegramBot,
  startTelegramPolling,
  telegramConnectedMessage,
} from '@pingo/notifications';
import { createHash } from 'node:crypto';
import { logger, trackEvent } from '@pingo/shared';
import type { Context } from 'grammy';
import { enqueueFirstCheck } from '@pingo/shared/jobs';

export async function startTelegramRuntime() {
  const bot = getTelegramBot({
    connectAccount,
    status,
    list,
    add,
    resolveUser,
  });
  if (!bot) {
    logger.info('telegram bot disabled: TELEGRAM_BOT_TOKEN is not set');
    return;
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (process.env.NODE_ENV !== 'production' || !webhookSecret) {
    await startTelegramPolling(bot);
  }
}

async function resolveUser(telegramUserId: string) {
  const connection = await prisma.telegramConnection.findFirst({
    where: { telegramUserId },
  });
  return connection ? { userId: connection.userId } : null;
}

async function requireUser(ctx: Context) {
  const telegramUserId = ctx.from ? String(ctx.from.id) : null;
  if (!telegramUserId) {
    await ctx.reply('Unable to identify this Telegram user.');
    return null;
  }
  const linked = await prisma.telegramConnection.findFirst({
    where: { telegramUserId },
    include: { user: { include: { subscription: true } } },
  });
  if (!linked) {
    await ctx.reply('This chat is not linked yet. Open PINGO and click Connect Telegram.');
    return null;
  }
  return linked;
}

async function connectAccount(ctx: Context, token: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const record = await prisma.telegramConnectToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { monitors: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    await ctx.reply('This connect link is invalid or expired. Generate a new one in PINGO.');
    return;
  }
  if (!ctx.from || !ctx.chat) {
    await ctx.reply('Unable to identify this Telegram chat.');
    return;
  }

  await prisma.$transaction([
    prisma.telegramConnectToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.telegramConnection.upsert({
      where: { userId: record.userId },
      create: {
        userId: record.userId,
        telegramUserId: String(ctx.from.id),
        telegramChatId: String(ctx.chat.id),
        username: ctx.from.username ?? null,
      },
      update: {
        telegramUserId: String(ctx.from.id),
        telegramChatId: String(ctx.chat.id),
        username: ctx.from.username ?? null,
        connectedAt: new Date(),
      },
    }),
  ]);

  await trackEvent('telegram_connected', {}, record.userId);
  await ctx.reply(telegramConnectedMessage(record.user.monitors.map((m) => m.displayHostname)));
}

async function status(ctx: Context) {
  const linked = await requireUser(ctx);
  if (!linked) return;
  const monitors = await prisma.monitor.findMany({
    where: { userId: linked.userId },
    include: { sslRecords: true, domain: true },
    orderBy: { createdAt: 'asc' },
  });
  if (monitors.length === 0) {
    await ctx.reply('PINGO Status\n\nNo monitors yet. Send /add https://example.com');
    return;
  }
  const blocks = monitors.map((monitor) => {
    const icon = monitor.status === 'UP' ? '🟢' : monitor.status === 'DOWN' ? '🔴' : '⚪';
    const http = monitor.currentHttpStatus ?? '—';
    const latency = monitor.currentLatencyMs != null ? ` · ${monitor.currentLatencyMs} ms` : '';
    const ssl = monitor.sslRecords[0]?.daysRemaining != null ? `SSL: ${monitor.sslRecords[0].daysRemaining} days` : 'SSL: —';
    const domainDays = monitor.domain?.expiresAt
      ? Math.floor((monitor.domain.expiresAt.getTime() - Date.now()) / 86400000)
      : null;
    const domain = domainDays != null ? `Domain: ${domainDays} days` : null;
    return [`${icon} ${monitor.displayHostname}`, `HTTP ${http}${latency}`, ssl, domain]
      .filter(Boolean)
      .join('\n');
  });
  await ctx.reply(['PINGO Status', '', ...blocks].join('\n\n'));
}

async function list(ctx: Context) {
  const linked = await requireUser(ctx);
  if (!linked) return;
  const monitors = await prisma.monitor.findMany({
    where: { userId: linked.userId },
    orderBy: { createdAt: 'asc' },
  });
  if (monitors.length === 0) {
    await ctx.reply('You have no monitors yet.');
    return;
  }
  await ctx.reply(monitors.map((m) => `• ${m.displayHostname} (${m.status})`).join('\n'));
}

async function add(ctx: Context, url: string) {
  const linked = await requireUser(ctx);
  if (!linked) return;
  try {
    const normalized = normalizeMonitorUrl(url);
    const activeCount = await prisma.monitor.count({
      where: { userId: linked.userId, pausedAt: null },
    });
    const plan = linked.user.subscription?.plan ?? 'FREE';
    assertCanCreateMonitor({ plan, activeMonitorCount: activeCount });

    let domain = await prisma.domain.findUnique({
      where: { userId_rootDomain: { userId: linked.userId, rootDomain: normalized.rootDomain } },
    });
    if (!domain) {
      domain = await prisma.domain.create({
        data: {
          userId: linked.userId,
          rootDomain: normalized.rootDomain,
          displayDomain: normalized.displayRootDomain,
        },
      });
    }

    const monitor = await prisma.monitor.create({
      data: {
        userId: linked.userId,
        domainId: domain.id,
        name: normalized.displayHostname,
        url: normalized.url,
        hostname: normalized.hostname,
        rootDomain: normalized.rootDomain,
        displayHostname: normalized.displayHostname,
        checkIntervalSeconds: clampCheckInterval(plan),
        firstCheckProgress: { website: 'pending', ssl: 'pending', dns: 'pending', domain: 'pending' },
      },
    });
    await enqueueFirstCheck({ monitorId: monitor.id });
    await ctx.reply(`Added ${normalized.displayHostname}. First check is running.`);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : 'Could not add that website.');
  }
}
