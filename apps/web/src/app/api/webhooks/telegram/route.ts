import { getTelegramBot, createTelegramWebhookCallback } from '@pingo/notifications';
import { prisma } from '@pingo/database';
import { assertCanCreateMonitor, clampCheckInterval, normalizeMonitorUrl } from '@pingo/monitoring';
import { trackEvent } from '@pingo/shared';
import { enqueueFirstCheck } from '@pingo/shared/jobs';
import { createHash } from 'node:crypto';
import { telegramConnectedMessage } from '@pingo/notifications';
import type { Context } from 'grammy';

export const runtime = 'nodejs';

function handlers() {
  return {
    connectAccount: async (ctx: Context, token: string) => {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const record = await prisma.telegramConnectToken.findUnique({
        where: { tokenHash },
        include: { user: { include: { monitors: true } } },
      });
      if (!record || record.usedAt || record.expiresAt < new Date()) {
        await ctx.reply('This connect link is invalid or expired.');
        return;
      }
      if (!ctx.from || !ctx.chat) return;
      await prisma.$transaction([
        prisma.telegramConnectToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
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
    },
    status: async (ctx: Context) => {
      const linked = await prisma.telegramConnection.findFirst({
        where: { telegramUserId: String(ctx.from?.id ?? '') },
      });
      if (!linked) {
        await ctx.reply('Connect Telegram from the PINGO dashboard first.');
        return;
      }
      const monitors = await prisma.monitor.findMany({
        where: { userId: linked.userId },
        include: { sslRecords: true, domain: true },
      });
      if (!monitors.length) {
        await ctx.reply('PINGO Status\n\nNo monitors yet.');
        return;
      }
      const text = monitors
        .map((m) => {
          const icon = m.status === 'UP' ? '🟢' : m.status === 'DOWN' ? '🔴' : '⚪';
          return `${icon} ${m.displayHostname}\nHTTP ${m.currentHttpStatus ?? '—'} · ${m.currentLatencyMs ?? '—'} ms`;
        })
        .join('\n\n');
      await ctx.reply(`PINGO Status\n\n${text}`);
    },
    list: async (ctx: Context) => {
      const linked = await prisma.telegramConnection.findFirst({
        where: { telegramUserId: String(ctx.from?.id ?? '') },
      });
      if (!linked) {
        await ctx.reply('Connect Telegram from the PINGO dashboard first.');
        return;
      }
      const monitors = await prisma.monitor.findMany({ where: { userId: linked.userId } });
      await ctx.reply(
        monitors.length
          ? monitors.map((m) => `• ${m.displayHostname}`).join('\n')
          : 'No monitors yet.',
      );
    },
    add: async (ctx: Context, url: string) => {
      const linked = await prisma.telegramConnection.findFirst({
        where: { telegramUserId: String(ctx.from?.id ?? '') },
        include: { user: { include: { subscription: true } } },
      });
      if (!linked) {
        await ctx.reply('Connect Telegram from the PINGO dashboard first.');
        return;
      }
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
          },
        });
        await enqueueFirstCheck({ monitorId: monitor.id });
        await ctx.reply(`Added ${normalized.displayHostname}.`);
      } catch (error) {
        await ctx.reply(error instanceof Error ? error.message : 'Could not add website');
      }
    },
    resolveUser: async (telegramUserId: string) => {
      const connection = await prisma.telegramConnection.findFirst({ where: { telegramUserId } });
      return connection ? { userId: connection.userId } : null;
    },
  };
}

export async function POST(request: Request) {
  const bot = getTelegramBot(handlers());
  if (!bot) {
    return new Response('Telegram is not configured', { status: 503 });
  }
  const callback = createTelegramWebhookCallback(bot);
  return callback(request);
}
