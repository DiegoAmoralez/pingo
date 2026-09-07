import { prisma } from '@pingo/database';
import { PlanLimitError, RateLimitError, trackEvent } from '@pingo/shared';
import { getPlan } from '@pingo/shared';
import { enqueueFirstCheck, enqueueWebsiteCheck } from '@pingo/shared/jobs';
import {
  assertCanCreateMonitor,
  clampCheckInterval,
  normalizeMonitorUrl,
} from '@pingo/monitoring';
import { MANUAL_CHECK_COOLDOWN_SECONDS } from '@pingo/shared';
import type { AddMonitorInput, UpdateMonitorInput } from '@pingo/shared';
import type { PlanCode } from '@pingo/shared';
import { assertOwned } from './access.js';

export async function getUserPlan(userId: string): Promise<PlanCode> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return 'FREE';
  if (sub.status === 'CANCELED' && sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) {
    return 'FREE';
  }
  if (sub.status === 'ACTIVE' || sub.status === 'TRIALING' || sub.status === 'PAST_DUE') {
    return sub.plan;
  }
  return 'FREE';
}

export async function createMonitor(userId: string, input: AddMonitorInput) {
  const normalized = normalizeMonitorUrl(input.url);
  const plan = await getUserPlan(userId);
  const activeCount = await prisma.monitor.count({ where: { userId, pausedAt: null } });
  assertCanCreateMonitor({ plan, activeMonitorCount: activeCount });

  const interval = clampCheckInterval(plan, input.checkIntervalSeconds);

  let domain = await prisma.domain.findUnique({
    where: { userId_rootDomain: { userId, rootDomain: normalized.rootDomain } },
  });
  if (!domain) {
    domain = await prisma.domain.create({
      data: {
        userId,
        rootDomain: normalized.rootDomain,
        displayDomain: normalized.displayRootDomain,
      },
    });
  }

  const monitor = await prisma.monitor.create({
    data: {
      userId,
      domainId: domain.id,
      name: input.name?.trim() || normalized.displayHostname,
      url: normalized.url,
      hostname: normalized.hostname,
      rootDomain: normalized.rootDomain,
      displayHostname: normalized.displayHostname,
      checkIntervalSeconds: interval,
      timeoutSeconds: input.timeoutSeconds ?? 10,
      expectedStatusCodes: input.expectedStatusCodes ?? '200-399',
      firstCheckProgress: { website: 'pending', ssl: 'pending', dns: 'pending', domain: 'pending' },
    },
    include: { domain: true, sslRecords: true },
  });

  await enqueueFirstCheck({ monitorId: monitor.id });
  await trackEvent('monitor_created', { hostname: monitor.hostname }, userId);
  return monitor;
}

export async function getMonitorForUser(userId: string, id: string) {
  const monitor = await prisma.monitor.findUnique({
    where: { id },
    include: {
      domain: { include: { events: { orderBy: { createdAt: 'desc' }, take: 20 } } },
      sslRecords: true,
      incidents: { orderBy: { startedAt: 'desc' }, take: 20 },
      dnsSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  return assertOwned(monitor, userId);
}

export async function updateMonitor(userId: string, id: string, input: UpdateMonitorInput) {
  const monitor = assertOwned(await prisma.monitor.findUnique({ where: { id } }), userId);
  const plan = await getUserPlan(userId);
  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name;
  if (input.timeoutSeconds) data.timeoutSeconds = input.timeoutSeconds;
  if (input.expectedStatusCodes) data.expectedStatusCodes = input.expectedStatusCodes;
  if (input.checkIntervalSeconds) {
    data.checkIntervalSeconds = clampCheckInterval(plan, input.checkIntervalSeconds);
  }
  if (input.url && input.url !== monitor.url) {
    const normalized = normalizeMonitorUrl(input.url);
    data.url = normalized.url;
    data.hostname = normalized.hostname;
    data.rootDomain = normalized.rootDomain;
    data.displayHostname = normalized.displayHostname;
  }
  if (input.paused === true) data.pausedAt = new Date();
  if (input.paused === false) {
    const activeCount = await prisma.monitor.count({
      where: { userId, pausedAt: null, NOT: { id } },
    });
    const definition = getPlan(plan);
    if (activeCount >= definition.maxMonitors) {
      throw new PlanLimitError(`You've reached your ${definition.name} plan limit.`, {
        plan: definition.code,
      });
    }
    data.pausedAt = null;
    data.nextCheckAt = new Date();
  }
  return prisma.monitor.update({ where: { id }, data });
}

export async function deleteMonitor(userId: string, id: string) {
  assertOwned(await prisma.monitor.findUnique({ where: { id } }), userId);
  await prisma.monitor.delete({ where: { id } });
}

export async function requestManualCheck(userId: string, id: string) {
  const monitor = assertOwned(await prisma.monitor.findUnique({ where: { id } }), userId);
  if (
    monitor.lastManualCheckAt &&
    Date.now() - monitor.lastManualCheckAt.getTime() < MANUAL_CHECK_COOLDOWN_SECONDS * 1000
  ) {
    throw new RateLimitError('Please wait a few seconds before checking again.');
  }
  await prisma.monitor.update({
    where: { id },
    data: { lastManualCheckAt: new Date() },
  });
  await enqueueWebsiteCheck({ monitorId: id, manual: true });
}

export async function pauseExcessMonitors(userId: string, plan: PlanCode) {
  const allowed = getPlan(plan).maxMonitors;
  const active = await prisma.monitor.findMany({
    where: { userId, pausedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const extra = active.slice(allowed);
  if (extra.length === 0) return;
  await prisma.monitor.updateMany({
    where: { id: { in: extra.map((m) => m.id) } },
    data: { pausedAt: new Date() },
  });
}
