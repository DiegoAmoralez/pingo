export function websiteDownMessage(input: {
  hostname: string;
  http: string;
  failedChecks: number;
  startedAt: string;
}) {
  return [
    '🔴 Website down',
    '',
    input.hostname,
    '',
    `HTTP: ${input.http}`,
    `Failed checks: ${input.failedChecks}`,
    '',
    'Started:',
    input.startedAt,
  ].join('\n');
}

export function websiteRecoveredMessage(input: {
  hostname: string;
  downtime: string;
  responseMs: number;
}) {
  return [
    '🟢 Website recovered',
    '',
    input.hostname,
    '',
    'Downtime:',
    input.downtime,
    '',
    'Response:',
    `${input.responseMs} ms`,
  ].join('\n');
}

export function sslExpiryMessage(input: { hostname: string; days: number; expiration: string }) {
  const title =
    input.days <= 0
      ? '⚠️ SSL certificate expired'
      : '⚠️ SSL certificate expires soon';
  return [
    title,
    '',
    input.hostname,
    '',
    'Expires in:',
    input.days <= 0 ? 'expired' : `${input.days} day${input.days === 1 ? '' : 's'}`,
    '',
    'Expiration:',
    input.expiration,
  ].join('\n');
}

export function domainExpiryMessage(input: {
  domain: string;
  days: number;
  registrar: string | null;
  expiration: string;
}) {
  return [
    `⚠️ Domain expires in ${input.days} day${input.days === 1 ? '' : 's'}`,
    '',
    input.domain,
    '',
    'Registrar:',
    input.registrar ?? 'Unknown',
    '',
    'Expiration:',
    input.expiration,
    '',
    'Make sure auto-renewal is enabled.',
  ].join('\n');
}

export function dnsChangedMessage(input: {
  hostname: string;
  type: string;
  oldValues: string[];
  newValues: string[];
}) {
  if (input.type === 'NS') {
    const removed = input.oldValues.filter((v) => !input.newValues.includes(v));
    const added = input.newValues.filter((v) => !input.oldValues.includes(v));
    return [
      '⚠️ Nameservers changed',
      '',
      input.hostname,
      '',
      ...(removed.length ? ['Removed:', ...removed, ''] : []),
      ...(added.length ? ['Added:', ...added] : []),
    ]
      .join('\n')
      .trim();
  }

  return [
    '⚠️ DNS changed',
    '',
    input.hostname,
    '',
    `${input.type} record`,
    '',
    'Old:',
    input.oldValues.join('\n') || '—',
    '',
    'New:',
    input.newValues.join('\n') || '—',
  ].join('\n');
}

export function telegramConnectedMessage(hostnames: string[]) {
  const list =
    hostnames.length > 0 ? hostnames.map((h) => `• ${h}`).join('\n') : '• No monitors yet';
  return [
    '✅ Telegram connected',
    '',
    'PINGO will notify you here when something',
    'important happens.',
    '',
    'Monitoring:',
    list,
  ].join('\n');
}

export function statusMessage(
  rows: Array<{
    hostname: string;
    up: boolean;
    http?: string;
    latencyMs?: number | null;
    sslDays?: number | null;
    domainDays?: number | null;
  }>,
) {
  if (rows.length === 0) {
    return 'PINGO Status\n\nNo monitors yet. Send /add https://example.com';
  }
  const blocks = rows.map((row) => {
    const icon = row.up ? '🟢' : '🔴';
    const http = row.http ? `HTTP ${row.http}` : 'HTTP —';
    const latency = row.latencyMs != null ? ` · ${row.latencyMs} ms` : '';
    const ssl = row.sslDays != null ? `SSL: ${row.sslDays} days` : 'SSL: —';
    const domain = row.domainDays != null ? `Domain: ${row.domainDays} days` : null;
    return [ `${icon} ${row.hostname}`, `${http}${latency}`, ssl, domain ].filter(Boolean).join('\n');
  });
  return ['PINGO Status', '', ...blocks].join('\n\n');
}

export function helpMessage() {
  return [
    'PINGO',
    '',
    '/start — connect your account',
    '/status — current status',
    '/list — all monitors',
    '/add https://example.com — add a website',
    '/help — this message',
  ].join('\n');
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} sec`;
  return `${minutes} min ${seconds} sec`;
}

export function formatUtc(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes} UTC`;
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
