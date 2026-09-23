export type AlertLocale = 'en' | 'ru';

export function toAlertLocale(value: unknown): AlertLocale {
  return value === 'ru' ? 'ru' : 'en';
}

function pluralRu(value: number, one: string, few: string, many: string): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function days(value: number, locale: AlertLocale): string {
  if (locale === 'ru') return `${value} ${pluralRu(value, 'день', 'дня', 'дней')}`;
  return `${value} day${value === 1 ? '' : 's'}`;
}

const L = {
  en: {
    down: '🔴 Website down',
    recovered: '🟢 Website recovered',
    http: 'HTTP',
    failedChecks: 'Failed checks',
    started: 'Started:',
    downtime: 'Downtime:',
    response: 'Response:',
    sslExpired: '⚠️ SSL certificate expired',
    sslSoon: '⚠️ SSL certificate expires soon',
    expiresIn: 'Expires in:',
    expired: 'expired',
    expiration: 'Expiration:',
    domainExpires: (d: string) => `⚠️ Domain expires in ${d}`,
    registrar: 'Registrar:',
    unknown: 'Unknown',
    autoRenew: 'Make sure auto-renewal is enabled.',
    nsChanged: '⚠️ Nameservers changed',
    removed: 'Removed:',
    added: 'Added:',
    dnsChanged: '⚠️ DNS changed',
    record: (type: string) => `${type} record`,
    old: 'Old:',
    new: 'New:',
    connected: '✅ Telegram connected',
    connectedBody: 'PingoGo will notify you here when something\nimportant happens.',
    monitoring: 'Monitoring:',
    noMonitors: '• No monitors yet',
  },
  ru: {
    down: '🔴 Сайт недоступен',
    recovered: '🟢 Сайт снова работает',
    http: 'HTTP',
    failedChecks: 'Неудачных проверок',
    started: 'Начало:',
    downtime: 'Простой:',
    response: 'Ответ:',
    sslExpired: '⚠️ SSL-сертификат истёк',
    sslSoon: '⚠️ SSL-сертификат скоро истекает',
    expiresIn: 'Истекает через:',
    expired: 'истёк',
    expiration: 'Дата окончания:',
    domainExpires: (d: string) => `⚠️ Домен истекает через ${d}`,
    registrar: 'Регистратор:',
    unknown: 'Неизвестно',
    autoRenew: 'Убедитесь, что включено автопродление.',
    nsChanged: '⚠️ Изменились NS-серверы',
    removed: 'Удалены:',
    added: 'Добавлены:',
    dnsChanged: '⚠️ Изменились DNS-записи',
    record: (type: string) => `Запись ${type}`,
    old: 'Было:',
    new: 'Стало:',
    connected: '✅ Telegram подключён',
    connectedBody: 'PingoGo напишет сюда, когда произойдёт\nчто-то важное.',
    monitoring: 'Под наблюдением:',
    noMonitors: '• Сайтов пока нет',
  },
} as const;

export function websiteDownMessage(input: {
  hostname: string;
  http: string;
  failedChecks: number;
  startedAt: string;
  locale?: AlertLocale;
}) {
  const t = L[input.locale ?? 'en'];
  return [
    t.down,
    '',
    input.hostname,
    '',
    `${t.http}: ${input.http}`,
    `${t.failedChecks}: ${input.failedChecks}`,
    '',
    t.started,
    input.startedAt,
  ].join('\n');
}

export function websiteRecoveredMessage(input: {
  hostname: string;
  downtime: string;
  responseMs: number;
  locale?: AlertLocale;
}) {
  const t = L[input.locale ?? 'en'];
  return [
    t.recovered,
    '',
    input.hostname,
    '',
    t.downtime,
    input.downtime,
    '',
    t.response,
    `${input.responseMs} ms`,
  ].join('\n');
}

export function sslExpiryMessage(input: {
  hostname: string;
  days: number;
  expiration: string;
  locale?: AlertLocale;
}) {
  const locale = input.locale ?? 'en';
  const t = L[locale];
  const title = input.days <= 0 ? t.sslExpired : t.sslSoon;
  return [
    title,
    '',
    input.hostname,
    '',
    t.expiresIn,
    input.days <= 0 ? t.expired : days(input.days, locale),
    '',
    t.expiration,
    input.expiration,
  ].join('\n');
}

export function domainExpiryMessage(input: {
  domain: string;
  days: number;
  registrar: string | null;
  expiration: string;
  locale?: AlertLocale;
}) {
  const locale = input.locale ?? 'en';
  const t = L[locale];
  return [
    t.domainExpires(days(input.days, locale)),
    '',
    input.domain,
    '',
    t.registrar,
    input.registrar ?? t.unknown,
    '',
    t.expiration,
    input.expiration,
    '',
    t.autoRenew,
  ].join('\n');
}

export function dnsChangedMessage(input: {
  hostname: string;
  type: string;
  oldValues: string[];
  newValues: string[];
  locale?: AlertLocale;
}) {
  const t = L[input.locale ?? 'en'];
  if (input.type === 'NS') {
    const removed = input.oldValues.filter((v) => !input.newValues.includes(v));
    const added = input.newValues.filter((v) => !input.oldValues.includes(v));
    return [
      t.nsChanged,
      '',
      input.hostname,
      '',
      ...(removed.length ? [t.removed, ...removed, ''] : []),
      ...(added.length ? [t.added, ...added] : []),
    ]
      .join('\n')
      .trim();
  }

  return [
    t.dnsChanged,
    '',
    input.hostname,
    '',
    t.record(input.type),
    '',
    t.old,
    input.oldValues.join('\n') || '—',
    '',
    t.new,
    input.newValues.join('\n') || '—',
  ].join('\n');
}

export function telegramConnectedMessage(hostnames: string[], locale: AlertLocale = 'en') {
  const t = L[locale];
  const list = hostnames.length > 0 ? hostnames.map((h) => `• ${h}`).join('\n') : t.noMonitors;
  return [t.connected, '', t.connectedBody, '', t.monitoring, list].join('\n');
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
    return 'PingoGo Status\n\nNo monitors yet. Send /add https://example.com';
  }
  const blocks = rows.map((row) => {
    const icon = row.up ? '🟢' : '🔴';
    const http = row.http ? `HTTP ${row.http}` : 'HTTP —';
    const latency = row.latencyMs != null ? ` · ${row.latencyMs} ms` : '';
    const ssl = row.sslDays != null ? `SSL: ${row.sslDays} days` : 'SSL: —';
    const domain = row.domainDays != null ? `Domain: ${row.domainDays} days` : null;
    return [`${icon} ${row.hostname}`, `${http}${latency}`, ssl, domain].filter(Boolean).join('\n');
  });
  return ['PingoGo Status', '', ...blocks].join('\n\n');
}

export function helpMessage() {
  return [
    'PingoGo',
    '',
    '/menu — main menu',
    '/sites — all monitors',
    '/add https://example.com — add a website',
    '/incidents — recent incidents',
    '/settings — notification settings',
    '/help — this message',
  ].join('\n');
}

export function formatDuration(ms: number, locale: AlertLocale = 'en'): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const min = locale === 'ru' ? 'мин' : 'min';
  const sec = locale === 'ru' ? 'сек' : 'sec';
  if (minutes === 0) return `${seconds} ${sec}`;
  return `${minutes} ${min} ${seconds} ${sec}`;
}

export function formatUtc(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes} UTC`;
}

export function formatLongDate(date: Date, locale: AlertLocale = 'en'): string {
  return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
