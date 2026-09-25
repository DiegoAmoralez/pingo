import { prisma } from '@pingo/database';
import { getStripeMode, subscriptionAppliesToMode, type StripeMode } from '@pingo/billing';
import {
  MANUAL_CHECK_COOLDOWN_SECONDS,
  PlanLimitError,
  RateLimitError,
  getPlan,
  trackEvent,
  type AddMonitorInput,
  type PlanCode,
  type UpdateMonitorInput,
} from '@pingo/shared';
import { enqueueFirstCheck, enqueueWebsiteCheck } from '@pingo/shared/jobs';
import {
  assertCanCreateMonitor,
  calculateUptimePercent,
  clampCheckInterval,
  normalizeMonitorUrl,
} from '@pingo/monitoring';
import { assertOwned } from './access.js';

type SubscriptionLike = {
  plan: PlanCode;
  status: string;
  currentPeriodEnd: Date | null;
  providerMode: string | null;
};

/**
 * Plan a subscription row grants right now. A row from the Stripe world that
 * is not active (e.g. a sandbox subscription while live mode is on) grants
 * nothing — but it is kept, so switching back restores it.
 */
export function effectivePlan(sub: SubscriptionLike | null | undefined, mode: StripeMode | null): PlanCode {
  if (!sub) return 'FREE';
  if (!subscriptionAppliesToMode(sub, mode)) return 'FREE';
  if (sub.status === 'CANCELED' && sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) {
    return 'FREE';
  }
  if (sub.status === 'ACTIVE' || sub.status === 'TRIALING' || sub.status === 'PAST_DUE') {
    return sub.plan;
  }
  return 'FREE';
}

export async function getUserPlan(userId: string): Promise<PlanCode> {
  const [sub, mode] = await Promise.all([prisma.subscription.findUnique({ where: { userId } }), getStripeMode()]);
  return effectivePlan(sub, mode);
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

export async function listMonitors(userId: string) {
  return prisma.monitor.findMany({
    where: { userId },
    include: { sslRecords: true, domain: true },
    orderBy: { createdAt: 'asc' },
  });
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

export type UptimeSummary = { h24: number | null; d7: number | null; d30: number | null };

export async function getMonitorUptime(monitorId: string): Promise<UptimeSummary> {
  const since = (hours: number) => new Date(Date.now() - hours * 3600 * 1000);
  const groupBy = (from: Date) =>
    prisma.monitorCheck.groupBy({
      by: ['status'],
      where: { monitorId, checkedAt: { gte: from } },
      _count: true,
    });
  const [counts24, counts7, counts30] = await Promise.all([
    groupBy(since(24)),
    groupBy(since(24 * 7)),
    groupBy(since(24 * 30)),
  ]);
  const uptimeFor = (rows: Array<{ status: string; _count: number }>) =>
    calculateUptimePercent({
      upCount: rows.find((r) => r.status === 'UP')?._count ?? 0,
      downCount: rows.find((r) => r.status === 'DOWN')?._count ?? 0,
    });
  return { h24: uptimeFor(counts24), d7: uptimeFor(counts7), d30: uptimeFor(counts30) };
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

export async function listIncidents(userId: string, options?: { monitorId?: string; take?: number }) {
  return prisma.incident.findMany({
    where: {
      monitor: { userId },
      ...(options?.monitorId ? { monitorId: options.monitorId } : {}),
    },
    include: { monitor: { select: { id: true, displayHostname: true } } },
    orderBy: { startedAt: 'desc' },
    take: options?.take ?? 10,
  });
}

export async function getNotificationPreferences(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  return (
    existing ?? {
      websiteDowntime: true,
      websiteRecovery: true,
      sslExpiration: true,
      domainExpiration: true,
      dnsChanges: true,
    }
  );
}

export type NotificationPreferenceKey =
  | 'websiteDowntime'
  | 'websiteRecovery'
  | 'sslExpiration'
  | 'domainExpiration'
  | 'dnsChanges';

export async function toggleNotificationPreference(userId: string, key: NotificationPreferenceKey) {
  const current = await getNotificationPreferences(userId);
  const next = { ...current, [key]: !current[key] };
  const data = {
    websiteDowntime: next.websiteDowntime,
    websiteRecovery: next.websiteRecovery,
    sslExpiration: next.sslExpiration,
    domainExpiration: next.domainExpiration,
    dnsChanges: next.dnsChanges,
  };
  await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return data;
}
