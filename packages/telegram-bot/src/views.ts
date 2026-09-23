import type {
  Domain,
  Incident,
  Monitor,
  SslRecord,
  Subscription,
  User,
  TelegramConnection,
} from '@pingo/database';
import { ERROR_CATEGORY_LABELS, formatPrice, getPlan, type PlanCode } from '@pingo/shared';
import type { NotificationPreferenceKey, UptimeSummary } from '@pingo/core';
import type { BotLocale, Dictionary } from './i18n.js';
import {
  bold,
  code,
  daysUntil,
  escapeHtml,
  formatDate,
  formatDateTime,
  formatDurationMs,
  formatPercent,
  formatRelative,
} from './format.js';
import { PREFERENCE_KEYS, preferenceLabel } from './keyboards.js';

type MonitorWithRelations = Monitor & { sslRecords: SslRecord[]; domain: Domain | null };

export type ViewContext = { t: Dictionary; locale: BotLocale; timeZone: string };

export function statusIcon(monitor: Pick<Monitor, 'status' | 'pausedAt'>): string {
  if (monitor.pausedAt) return '⏸';
  if (monitor.status === 'UP') return '🟢';
  if (monitor.status === 'DOWN') return '🔴';
  return '⚪';
}

export function statusLabel(t: Dictionary, monitor: Pick<Monitor, 'status' | 'pausedAt'>): string {
  if (monitor.pausedAt) return t.statusPaused;
  if (monitor.status === 'UP') return t.statusUp;
  if (monitor.status === 'DOWN') return t.statusDown;
  return t.statusUnknown;
}

export function renderMenu(
  ctx: ViewContext,
  input: { name: string; monitors: Array<Pick<Monitor, 'status' | 'pausedAt'>>; plan: PlanCode },
): string {
  const { t } = ctx;
  const up = input.monitors.filter((m) => !m.pausedAt && m.status === 'UP').length;
  const down = input.monitors.filter((m) => !m.pausedAt && m.status === 'DOWN').length;
  const paused = input.monitors.filter((m) => m.pausedAt).length;
  const plan = getPlan(input.plan);
  const lines = [
    bold(t.menuTitle),
    escapeHtml(input.name),
    '',
    input.monitors.length === 0 ? escapeHtml(t.noMonitorsYet) : escapeHtml(t.sitesSummary(up, down, paused)),
    `${escapeHtml(t.currentPlan)}: ${bold(plan.name)} · ${input.monitors.filter((m) => !m.pausedAt).length}/${plan.maxMonitors}`,
  ];
  return lines.join('\n');
}

export function renderNotLinked(ctx: ViewContext): string {
  const { t } = ctx;
  return [bold(t.appName), '', escapeHtml(t.notLinkedTitle), '', escapeHtml(t.notLinkedSteps)].join('\n');
}

export function renderLinked(ctx: ViewContext, hostnames: string[]): string {
  const { t } = ctx;
  const list = hostnames.length ? hostnames.map((h) => `• ${escapeHtml(h)}`) : [`• ${escapeHtml(t.noMonitorsYet)}`];
  return [bold(t.linkedTitle), '', escapeHtml(t.linkedBody), '', escapeHtml(t.monitoring), ...list].join('\n');
}

export function siteButtonLabel(monitor: MonitorWithRelations): string {
  const latency = !monitor.pausedAt && monitor.currentLatencyMs != null ? ` · ${monitor.currentLatencyMs} ms` : '';
  return `${statusIcon(monitor)} ${monitor.displayHostname}${latency}`;
}

export function renderSites(ctx: ViewContext, monitors: MonitorWithRelations[]): string {
  const { t } = ctx;
  if (monitors.length === 0) return [bold(t.sitesTitle), '', escapeHtml(t.sitesEmpty)].join('\n');
  const up = monitors.filter((m) => !m.pausedAt && m.status === 'UP').length;
  const down = monitors.filter((m) => !m.pausedAt && m.status === 'DOWN').length;
  const paused = monitors.filter((m) => m.pausedAt).length;
  return [bold(t.sitesTitle), '', escapeHtml(t.sitesSummary(up, down, paused))].join('\n');
}

export function renderSite(
  ctx: ViewContext,
  input: {
    monitor: MonitorWithRelations & { incidents: Incident[]; dnsSnapshots: Array<{ records: unknown }> };
    uptime: UptimeSummary;
  },
): string {
  const { t, locale, timeZone } = ctx;
  const { monitor, uptime } = input;
  const ssl = monitor.sslRecords[0];
  const domainDays = daysUntil(monitor.domain?.expiresAt);
  const lastIncident = monitor.incidents[0];
  const lines: string[] = [
    `${statusIcon(monitor)} ${bold(monitor.name)}`,
    code(monitor.url),
    '',
    `${escapeHtml(t.status)}: ${escapeHtml(statusLabel(t, monitor))}`,
  ];

  if (monitor.status === 'DOWN' && monitor.lastErrorType) {
    const label = ERROR_CATEGORY_LABELS[monitor.lastErrorType] ?? monitor.lastErrorType;
    lines.push(`${escapeHtml(t.error)}: ${escapeHtml(label)}`);
  }

  const http = monitor.currentHttpStatus != null ? String(monitor.currentHttpStatus) : t.unknown;
  const latency = monitor.currentLatencyMs != null ? `${monitor.currentLatencyMs} ms` : t.unknown;
  lines.push(`${escapeHtml(t.http)}: ${escapeHtml(http)} · ${escapeHtml(t.latency)}: ${escapeHtml(latency)}`);
  lines.push(
    `${escapeHtml(t.uptime)}: 24h ${formatPercent(uptime.h24)} · 7d ${formatPercent(uptime.d7)} · 30d ${formatPercent(uptime.d30)}`,
  );
  lines.push(
    `${escapeHtml(t.lastCheck)}: ${monitor.lastCheckedAt ? escapeHtml(formatRelative(monitor.lastCheckedAt, locale)) : escapeHtml(t.neverChecked)}`,
  );
  lines.push(
    `${escapeHtml(t.lastOutage)}: ${lastIncident ? escapeHtml(formatDateTime(lastIncident.startedAt, locale, timeZone)) : escapeHtml(t.never)}`,
  );
  lines.push(`${escapeHtml(t.interval)}: ${escapeHtml(t.everyMinutes(Math.round(monitor.checkIntervalSeconds / 60)))}`);
  lines.push('');

  if (ssl?.daysRemaining != null) {
    const sslText = ssl.daysRemaining <= 0 ? t.expired : t.daysLeft(ssl.daysRemaining);
    const issuer = ssl.issuer ? ` · ${escapeHtml(t.issuer)}: ${escapeHtml(ssl.issuer)}` : '';
    const icon = ssl.daysRemaining <= 7 ? '⚠️' : '🔒';
    lines.push(`${icon} ${escapeHtml(t.ssl)}: ${escapeHtml(sslText)}${issuer}`);
  } else {
    lines.push(`🔒 ${escapeHtml(t.ssl)}: ${escapeHtml(t.unknown)}`);
  }

  if (monitor.domain?.expiresAt && domainDays != null) {
    const icon = domainDays <= 14 ? '⚠️' : '🌐';
    const registrar = monitor.domain.registrar ? ` · ${escapeHtml(t.registrar)}: ${escapeHtml(monitor.domain.registrar)}` : '';
    lines.push(
      `${icon} ${escapeHtml(t.domain)}: ${escapeHtml(t.daysLeft(domainDays))} (${escapeHtml(formatDate(monitor.domain.expiresAt, locale, timeZone))})${registrar}`,
    );
  } else {
    lines.push(`🌐 ${escapeHtml(t.domain)}: ${escapeHtml(t.unknown)}`);
  }

  const dns = summarizeDns(monitor.dnsSnapshots[0]?.records);
  if (dns.length) {
    lines.push(`🧭 ${escapeHtml(t.dns)}: ${escapeHtml(dns.join(' · '))}`);
  }

  return lines.join('\n');
}

function summarizeDns(records: unknown): string[] {
  if (!records || typeof records !== 'object') return [];
  const out: string[] = [];
  for (const [type, raw] of Object.entries(records as Record<string, unknown>)) {
    if (!Array.isArray(raw)) continue;
    const values = raw.map((v) => String(v).trim()).filter(Boolean);
    if (values.length === 0) continue;
    const first = values[0] as string;
    const more = values.length > 1 ? ` +${values.length - 1}` : '';
    out.push(`${type} ${first}${more}`);
    if (out.length >= 3) break;
  }
  return out;
}

export function renderIncidents(
  ctx: ViewContext,
  input: {
    incidents: Array<Incident & { monitor: { id: string; displayHostname: string } }>;
    hostname?: string;
  },
): string {
  const { t, locale, timeZone } = ctx;
  const title = input.hostname ? `${t.incidentsTitle} · ${input.hostname}` : t.incidentsTitle;
  if (input.incidents.length === 0) return [bold(title), '', escapeHtml(t.incidentsEmpty)].join('\n');

  const blocks = input.incidents.map((incident) => {
    const state = incident.status === 'OPEN' ? t.incidentOpen : t.incidentResolved;
    const duration =
      incident.status === 'OPEN'
        ? t.ongoing
        : formatDurationMs(incident.durationMs ?? (incident.endedAt ? incident.endedAt.getTime() - incident.startedAt.getTime() : 0), locale);
    const lines = [
      `${escapeHtml(state)} · ${bold(incident.monitor.displayHostname)}`,
      `${escapeHtml(t.started)}: ${escapeHtml(formatDateTime(incident.startedAt, locale, timeZone))}`,
      `${escapeHtml(t.duration)}: ${escapeHtml(duration)}`,
    ];
    if (incident.reason) lines.push(`${escapeHtml(t.reason)}: ${escapeHtml(incident.reason)}`);
    return lines.join('\n');
  });
  return [bold(title), '', ...blocks].join('\n\n');
}

export function renderNotifications(
  ctx: ViewContext,
  prefs: Record<NotificationPreferenceKey, boolean>,
): string {
  const { t } = ctx;
  const enabled = PREFERENCE_KEYS.filter((key) => prefs[key]).map((key) => preferenceLabel(t, key));
  return [
    bold(t.notificationsTitle),
    '',
    escapeHtml(t.notificationsBody),
    '',
    enabled.length ? enabled.map((label) => `✅ ${escapeHtml(label)}`).join('\n') : '☐',
  ].join('\n');
}

export function renderPlan(
  ctx: ViewContext,
  input: { plan: PlanCode; activeMonitors: number; subscription: Subscription | null },
): string {
  const { t, locale, timeZone } = ctx;
  const plan = getPlan(input.plan);
  const lines = [
    bold(t.planTitle),
    '',
    `${escapeHtml(t.currentPlan)}: ${bold(plan.name)} · ${escapeHtml(formatPrice(plan.monthlyPriceCents))}`,
    `${escapeHtml(t.sitesUsed)}: ${input.activeMonitors}/${plan.maxMonitors}`,
    `${escapeHtml(t.minInterval)}: ${escapeHtml(t.minutes(Math.round(plan.minCheckIntervalSeconds / 60)))}`,
    `${escapeHtml(t.history)}: ${escapeHtml(t.historyDays(plan.historyDays))}`,
  ];
  const sub = input.subscription;
  if (sub?.currentPeriodEnd && input.plan !== 'FREE') {
    const label = sub.cancelAtPeriodEnd ? t.cancelsOn : t.renewsOn;
    lines.push(`${escapeHtml(label)}: ${escapeHtml(formatDate(sub.currentPeriodEnd, locale, timeZone))}`);
  }
  return lines.join('\n');
}

export function upgradeOptions(current: PlanCode): Array<{ code: PlanCode; name: string; price: string }> {
  const order: PlanCode[] = ['FREE', 'PERSONAL', 'PRO', 'AGENCY'];
  const index = order.indexOf(current);
  return order
    .slice(index + 1)
    .map((code) => getPlan(code))
    .map((plan) => ({ code: plan.code, name: plan.name, price: formatPrice(plan.monthlyPriceCents) }));
}

export function renderAccount(
  ctx: ViewContext,
  input: { user: User; connection: TelegramConnection },
): string {
  const { t, locale, timeZone } = ctx;
  const tg = input.connection.username ? `@${input.connection.username}` : input.connection.telegramUserId;
  return [
    bold(t.accountTitle),
    '',
    `${escapeHtml(t.name)}: ${escapeHtml(input.user.name)}`,
    `${escapeHtml(t.email)}: ${escapeHtml(input.user.email)}`,
    `${escapeHtml(t.timezone)}: ${escapeHtml(input.user.timezone)}`,
    `${escapeHtml(t.telegram)}: ${escapeHtml(tg)}`,
    `${escapeHtml(t.connectedSince)}: ${escapeHtml(formatDate(input.connection.connectedAt, locale, timeZone))}`,
  ].join('\n');
}

export function renderLanguage(ctx: ViewContext): string {
  const { t } = ctx;
  return [bold(t.languageTitle), '', escapeHtml(t.languageBody)].join('\n');
}

export function renderHelp(ctx: ViewContext): string {
  const { t } = ctx;
  return [bold(t.helpTitle), '', escapeHtml(t.helpBody)].join('\n');
}

export function renderAdd(ctx: ViewContext): string {
  const { t } = ctx;
  return [bold(t.addTitle), '', escapeHtml(t.addPrompt), '', escapeHtml(t.addHint)].join('\n');
}

export function renderConfirmDelete(ctx: ViewContext, hostname: string): string {
  const { t } = ctx;
  return [bold(t.confirmDeleteTitle(hostname)), '', escapeHtml(t.confirmDeleteBody)].join('\n');
}

export function renderConfirmDisconnect(ctx: ViewContext): string {
  const { t } = ctx;
  return [bold(t.confirmDisconnectTitle), '', escapeHtml(t.confirmDisconnectBody)].join('\n');
}
