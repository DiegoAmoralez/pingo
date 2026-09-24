import 'server-only';
import { prisma } from '@pingo/database';
import type { ErrorCategory } from '@pingo/database';
import { queueAlert } from '@pingo/core';
import {
  dnsChangeKey,
  domainAlertThreshold,
  nsChangeKey,
  siteDownKey,
  siteRecoveryKey,
  sslAlertThreshold,
} from '@pingo/monitoring';
import { CONSECUTIVE_FAILURES_FOR_DOWN, ERROR_CATEGORY_LABELS, type DnsRecords } from '@pingo/shared';
import {
  dnsChangedMessage,
  domainExpiryMessage,
  formatDuration,
  formatLongDate,
  formatUtc,
  sslExpiryMessage,
  toAlertLocale,
  websiteDownMessage,
  websiteRecoveredMessage,
} from '@pingo/notifications';
import { isTestAccount } from './test-account';

/**
 * Admin-only incident simulator.
 *
 * Writes the same rows the worker would write for a real event (checks,
 * incidents, SSL/domain records, DNS snapshots) and queues the same Telegram
 * alerts through the same notification pipeline, so the whole chain —
 * dashboard, bot, Mini App, delivery status — can be verified on demand.
 */
export const SIMULATION_SCENARIOS = ['down', 'recovery', 'ssl', 'domain', 'dns', 'ns', 'all'] as const;
export type SimulationScenario = (typeof SIMULATION_SCENARIOS)[number];

export const DOWN_CAUSES = ['http_502', 'http_500', 'http_404', 'timeout', 'refused', 'dns', 'tls'] as const;
export type DownCause = (typeof DOWN_CAUSES)[number];

export type SimulationStep = { level: 'ok' | 'skip' | 'info'; text: string };
export type SimulationResult = { steps: SimulationStep[] };

type MonitorWithUser = NonNullable<Awaited<ReturnType<typeof loadMonitor>>>;

const DOWN_RESULTS: Record<
  DownCause,
  { httpStatus: number | null; latencyMs: number; errorType: ErrorCategory; errorMessage: string; http: string }
> = {
  http_502: { httpStatus: 502, latencyMs: 1200, errorType: 'HTTP_ERROR', errorMessage: 'HTTP 502', http: '502 Bad Gateway' },
  http_500: { httpStatus: 500, latencyMs: 860, errorType: 'HTTP_ERROR', errorMessage: 'HTTP 500', http: '500 Internal Server Error' },
  http_404: { httpStatus: 404, latencyMs: 240, errorType: 'HTTP_ERROR', errorMessage: 'HTTP 404', http: '404 Not Found' },
  timeout: { httpStatus: null, latencyMs: 10000, errorType: 'CONNECTION_TIMEOUT', errorMessage: 'Connection timeout after 10s', http: 'Connection timeout after 10s' },
  refused: { httpStatus: null, latencyMs: 35, errorType: 'CONNECTION_REFUSED', errorMessage: 'Connection refused', http: 'Connection refused' },
  dns: { httpStatus: null, latencyMs: 12, errorType: 'DNS_ERROR', errorMessage: 'DNS lookup failed (ENOTFOUND)', http: 'DNS lookup failed (ENOTFOUND)' },
  tls: { httpStatus: null, latencyMs: 410, errorType: 'TLS_ERROR', errorMessage: 'TLS handshake failed: certificate has expired', http: 'TLS handshake failed: certificate has expired' },
};

function loadMonitor(monitorId: string) {
  return prisma.monitor.findUnique({
    where: { id: monitorId },
    include: {
      user: { include: { preferences: true, telegram: true } },
      sslRecords: true,
      domain: true,
      dnsSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
}

/** Unique key for simulated threshold alerts so repeated runs are never deduplicated away. */
function simulationKey(kind: string, monitorId: string) {
  return `sim:${kind}:${monitorId}:${Date.now()}`;
}

export async function simulateIncident(input: {
  monitorId: string;
  scenario: SimulationScenario;
  cause?: DownCause;
  days?: number;
}): Promise<SimulationResult> {
  const monitor = await loadMonitor(input.monitorId);
  if (!monitor) throw new Error('Monitor not found');

  const steps: SimulationStep[] = [];
  const cause = input.cause ?? 'http_502';
  const days = input.days ?? 7;

  switch (input.scenario) {
    case 'down':
      await simulateDown(monitor, cause, steps);
      break;
    case 'recovery':
      await simulateRecovery(monitor, steps);
      break;
    case 'ssl':
      await simulateSslExpiry(monitor, days, steps);
      break;
    case 'domain':
      await simulateDomainExpiry(monitor, days, steps);
      break;
    case 'dns':
      await simulateDnsChange(monitor, 'A', steps);
      break;
    case 'ns':
      await simulateDnsChange(monitor, 'NS', steps);
      break;
    case 'all':
      await simulateDown(monitor, cause, steps);
      await simulateSslExpiry(monitor, 7, steps);
      await simulateDomainExpiry(monitor, 14, steps);
      await simulateDnsChange(monitor, 'A', steps);
      await simulateDnsChange(monitor, 'NS', steps);
      break;
  }

  if (!monitor.user.telegram) {
    steps.push({
      level: 'info',
      text: 'Telegram is not linked to this account — queued alerts will end up FAILED.',
    });
  }
  return { steps };
}

async function simulateDown(monitor: MonitorWithUser, cause: DownCause, steps: SimulationStep[]) {
  const existing = await prisma.incident.findFirst({ where: { monitorId: monitor.id, status: 'OPEN' } });
  if (existing) {
    steps.push({ level: 'skip', text: `Incident already open since ${formatUtc(existing.startedAt)} — run "Recovery" first.` });
    return;
  }

  const failure = DOWN_RESULTS[cause];
  const result = {
    status: 'DOWN' as const,
    httpStatus: failure.httpStatus,
    latencyMs: failure.latencyMs,
    errorType: failure.errorType,
    errorMessage: failure.errorMessage,
    redirectTarget: null,
    finalUrl: monitor.url,
    simulated: true,
  };

  // The worker needs CONSECUTIVE_FAILURES_FOR_DOWN failed checks before it opens an incident.
  await prisma.monitorCheck.createMany({
    data: Array.from({ length: CONSECUTIVE_FAILURES_FOR_DOWN }, (_, index) => ({
      monitorId: monitor.id,
      status: 'DOWN' as const,
      httpStatus: failure.httpStatus,
      latencyMs: failure.latencyMs,
      errorType: failure.errorType,
      errorMessage: failure.errorMessage,
      checkedAt: new Date(Date.now() - (CONSECUTIVE_FAILURES_FOR_DOWN - 1 - index) * 60_000),
    })),
  });

  const incident = await prisma.incident.create({
    data: {
      monitorId: monitor.id,
      startedAt: new Date(),
      reason: failure.errorMessage ?? ERROR_CATEGORY_LABELS[failure.errorType],
      firstFailure: result,
      lastFailure: result,
      status: 'OPEN',
    },
  });
  await prisma.analyticsEvent.create({
    data: { userId: monitor.userId, name: 'incident_started', properties: { monitorId: monitor.id, simulated: true } },
  });
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      status: 'DOWN',
      consecutiveFailures: CONSECUTIVE_FAILURES_FOR_DOWN,
      lastCheckedAt: new Date(),
      currentLatencyMs: failure.latencyMs,
      currentHttpStatus: failure.httpStatus,
      lastErrorType: failure.errorType,
      lastErrorMessage: failure.errorMessage,
    },
  });
  steps.push({ level: 'ok', text: `Incident opened: ${failure.http}. Monitor is DOWN.` });

  if (monitor.user.preferences?.websiteDowntime === false) {
    steps.push({ level: 'skip', text: 'Downtime alerts are disabled in this account — no Telegram message.' });
    return;
  }
  const queued = await queueAlert({
    userId: monitor.userId,
    monitorId: monitor.id,
    type: 'WEBSITE_DOWN',
    deduplicationKey: siteDownKey(monitor.id, incident.id),
    text: websiteDownMessage({
      hostname: monitor.displayHostname,
      http: failure.http,
      failedChecks: CONSECUTIVE_FAILURES_FOR_DOWN,
      startedAt: formatUtc(incident.startedAt),
      locale: toAlertLocale(monitor.user.telegram?.locale),
    }),
  });
  steps.push({ level: queued ? 'ok' : 'skip', text: queued ? 'WEBSITE_DOWN alert queued.' : 'WEBSITE_DOWN alert deduplicated.' });
}

async function simulateRecovery(monitor: MonitorWithUser, steps: SimulationStep[]) {
  const incident = await prisma.incident.findFirst({
    where: { monitorId: monitor.id, status: 'OPEN' },
    orderBy: { startedAt: 'desc' },
  });
  if (!incident) {
    steps.push({ level: 'skip', text: 'No open incident — run "Site down" first.' });
    return;
  }

  const endedAt = new Date();
  const durationMs = Math.max(1000, endedAt.getTime() - incident.startedAt.getTime());
  const latencyMs = 186;

  await prisma.monitorCheck.create({
    data: { monitorId: monitor.id, status: 'UP', httpStatus: 200, latencyMs },
  });
  await prisma.incident.update({
    where: { id: incident.id },
    data: { status: 'RESOLVED', endedAt, durationMs },
  });
  await prisma.analyticsEvent.create({
    data: { userId: monitor.userId, name: 'incident_recovered', properties: { monitorId: monitor.id, simulated: true } },
  });
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      status: 'UP',
      consecutiveFailures: 0,
      lastCheckedAt: endedAt,
      lastSuccessfulAt: endedAt,
      currentLatencyMs: latencyMs,
      currentHttpStatus: 200,
      lastErrorType: null,
      lastErrorMessage: null,
    },
  });
  steps.push({ level: 'ok', text: `Incident resolved after ${formatDuration(durationMs)}. Monitor is UP.` });

  if (monitor.user.preferences?.websiteRecovery === false) {
    steps.push({ level: 'skip', text: 'Recovery alerts are disabled in this account — no Telegram message.' });
    return;
  }
  const locale = toAlertLocale(monitor.user.telegram?.locale);
  const queued = await queueAlert({
    userId: monitor.userId,
    monitorId: monitor.id,
    type: 'WEBSITE_RECOVERY',
    deduplicationKey: siteRecoveryKey(monitor.id, incident.id),
    text: websiteRecoveredMessage({
      hostname: monitor.displayHostname,
      downtime: formatDuration(durationMs, locale),
      responseMs: latencyMs,
      locale,
    }),
  });
  steps.push({ level: queued ? 'ok' : 'skip', text: queued ? 'WEBSITE_RECOVERY alert queued.' : 'WEBSITE_RECOVERY alert deduplicated.' });
}

async function simulateSslExpiry(monitor: MonitorWithUser, days: number, steps: SimulationStep[]) {
  const validUntil = new Date(Date.now() + days * 86_400_000);
  const threshold = sslAlertThreshold(days) ?? days;

  await prisma.sslRecord.upsert({
    where: { monitorId: monitor.id },
    create: {
      monitorId: monitor.id,
      issuer: monitor.sslRecords[0]?.issuer ?? "Let's Encrypt",
      validFrom: new Date(Date.now() - (90 - days) * 86_400_000),
      validUntil,
      fingerprint: 'simulated',
      daysRemaining: days,
      lastAlertThreshold: threshold,
      checkedAt: new Date(),
    },
    update: { validUntil, daysRemaining: days, lastAlertThreshold: threshold, checkedAt: new Date() },
  });
  steps.push({ level: 'ok', text: `SSL record set to expire in ${days} day(s).` });

  if (monitor.user.preferences?.sslExpiration === false) {
    steps.push({ level: 'skip', text: 'SSL alerts are disabled in this account — no Telegram message.' });
    return;
  }
  const locale = toAlertLocale(monitor.user.telegram?.locale);
  await queueAlert({
    userId: monitor.userId,
    monitorId: monitor.id,
    type: 'SSL_EXPIRY',
    deduplicationKey: simulationKey('ssl', monitor.id),
    text: sslExpiryMessage({
      hostname: monitor.displayHostname,
      days,
      expiration: formatLongDate(validUntil, locale),
      locale,
    }),
  });
  steps.push({ level: 'ok', text: 'SSL_EXPIRY alert queued.' });
}

async function simulateDomainExpiry(monitor: MonitorWithUser, days: number, steps: SimulationStep[]) {
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  const threshold = domainAlertThreshold(days) ?? days;

  // Monitors created before domain tracking may have no Domain row yet.
  const domain = await prisma.domain.upsert({
    where: { userId_rootDomain: { userId: monitor.userId, rootDomain: monitor.rootDomain } },
    create: {
      userId: monitor.userId,
      rootDomain: monitor.rootDomain,
      displayDomain: monitor.rootDomain,
      registrar: 'Simulated Registrar',
      expiresAt,
      lastCheckedAt: new Date(),
      lastAlertThreshold: threshold,
      provider: 'simulation',
    },
    update: { expiresAt, lastCheckedAt: new Date(), lastAlertThreshold: threshold },
  });
  if (monitor.domainId !== domain.id) {
    await prisma.monitor.update({ where: { id: monitor.id }, data: { domainId: domain.id } });
  }
  steps.push({ level: 'ok', text: `Domain ${domain.displayDomain} set to expire in ${days} day(s).` });

  if (monitor.user.preferences?.domainExpiration === false) {
    steps.push({ level: 'skip', text: 'Domain alerts are disabled in this account — no Telegram message.' });
    return;
  }
  const locale = toAlertLocale(monitor.user.telegram?.locale);
  await queueAlert({
    userId: monitor.userId,
    monitorId: monitor.id,
    type: 'DOMAIN_EXPIRY',
    deduplicationKey: simulationKey('domain', monitor.id),
    text: domainExpiryMessage({
      domain: domain.displayDomain,
      days,
      registrar: domain.registrar,
      expiration: formatLongDate(expiresAt, locale),
      locale,
    }),
  });
  steps.push({ level: 'ok', text: 'DOMAIN_EXPIRY alert queued.' });
}

async function simulateDnsChange(monitor: MonitorWithUser, type: 'A' | 'NS', steps: SimulationStep[]) {
  const previous = (monitor.dnsSnapshots[0]?.records as DnsRecords | undefined) ?? {
    A: ['93.184.216.34'],
    AAAA: [],
    CNAME: [],
    MX: [],
    NS: ['ns1.example-dns.net', 'ns2.example-dns.net'],
    TXT: [],
  };
  const oldValues = previous[type];
  const newValues =
    type === 'A'
      ? [`203.0.113.${(Date.now() % 200) + 10}`]
      : [`ns1.new-provider-${Date.now() % 1000}.com`, `ns2.new-provider-${Date.now() % 1000}.com`];
  const records: DnsRecords = { ...previous, [type]: newValues };

  // Two snapshots: the "before" state (if none existed) and the changed one, like consecutive checks.
  if (!monitor.dnsSnapshots[0]) {
    await prisma.dnsSnapshot.create({ data: { monitorId: monitor.id, records: previous } });
  }
  const snapshot = await prisma.dnsSnapshot.create({ data: { monitorId: monitor.id, records } });
  steps.push({ level: 'ok', text: `${type} records changed: ${oldValues.join(', ') || '—'} → ${newValues.join(', ')}.` });

  if (monitor.user.preferences?.dnsChanges === false) {
    steps.push({ level: 'skip', text: 'DNS alerts are disabled in this account — no Telegram message.' });
    return;
  }
  const queued = await queueAlert({
    userId: monitor.userId,
    monitorId: monitor.id,
    type: type === 'NS' ? 'NS_CHANGED' : 'DNS_CHANGED',
    deduplicationKey: type === 'NS' ? nsChangeKey(monitor.id, snapshot.id) : dnsChangeKey(monitor.id, `${snapshot.id}:${type}`),
    text: dnsChangedMessage({
      hostname: monitor.displayHostname,
      type,
      oldValues,
      newValues,
      locale: toAlertLocale(monitor.user.telegram?.locale),
    }),
  });
  steps.push({ level: queued ? 'ok' : 'skip', text: `${type === 'NS' ? 'NS_CHANGED' : 'DNS_CHANGED'} alert ${queued ? 'queued' : 'deduplicated'}.` });
}

/** Accounts and their monitors for the simulator's pickers. */
export async function listSimulationTargets() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      subscription: { select: { plan: true } },
      telegram: { select: { username: true, locale: true } },
      monitors: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, displayHostname: true, status: true, pausedAt: true },
      },
    },
  });
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    internal: isTestAccount(user.email),
    plan: user.subscription?.plan ?? 'FREE',
    telegram: user.telegram ? (user.telegram.username ? `@${user.telegram.username}` : 'linked') : null,
    alertLocale: toAlertLocale(user.telegram?.locale),
    monitors: user.monitors.map((m) => ({
      id: m.id,
      hostname: m.displayHostname,
      status: m.status,
      paused: m.pausedAt !== null,
    })),
  }));
}

/** Latest notification events for one account, newest first. */
export async function listRecentNotifications(userId: string, take = 12) {
  const events = await prisma.notificationEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      sentAt: true,
      monitor: { select: { displayHostname: true } },
    },
  });
  return events.map((event) => ({
    id: event.id,
    type: event.type,
    status: event.status,
    hostname: event.monitor?.displayHostname ?? null,
    createdAt: event.createdAt.toISOString(),
    sentAt: event.sentAt?.toISOString() ?? null,
  }));
}
