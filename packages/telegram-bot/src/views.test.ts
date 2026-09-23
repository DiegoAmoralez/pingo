import { describe, expect, it } from 'vitest';
import { dictionary, toBotLocale } from './i18n.js';
import { escapeHtml, looksLikeUrl, formatDurationMs } from './format.js';
import { CB, idFrom, withId } from './callbacks.js';
import { mainMenuKeyboard, notificationsKeyboard, siteKeyboard } from './keyboards.js';
import { renderMenu, renderSite, statusLabel, type ViewContext } from './views.js';

const en: ViewContext = { t: dictionary('en'), locale: 'en', timeZone: 'UTC' };
const ru: ViewContext = { t: dictionary('ru'), locale: 'ru', timeZone: 'UTC' };

describe('locale detection', () => {
  it('maps Telegram language codes', () => {
    expect(toBotLocale('ru')).toBe('ru');
    expect(toBotLocale('ru-RU')).toBe('ru');
    expect(toBotLocale('en')).toBe('en');
    expect(toBotLocale(undefined)).toBe('en');
  });

  it('keeps both dictionaries in sync', () => {
    expect(Object.keys(dictionary('ru')).sort()).toEqual(Object.keys(dictionary('en')).sort());
  });

  it('pluralizes Russian days', () => {
    const t = dictionary('ru');
    expect(t.daysLeft(1)).toContain('день');
    expect(t.daysLeft(3)).toContain('дня');
    expect(t.daysLeft(11)).toContain('дней');
  });
});

describe('formatting helpers', () => {
  it('escapes HTML for Telegram', () => {
    expect(escapeHtml('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;');
  });

  it('detects urls typed without a scheme', () => {
    expect(looksLikeUrl('https://example.com/path')).toBe(true);
    expect(looksLikeUrl('example.com')).toBe(true);
    expect(looksLikeUrl('hello there')).toBe(false);
    expect(looksLikeUrl('/menu')).toBe(false);
  });

  it('formats durations per locale', () => {
    expect(formatDurationMs(90 * 60000, 'en')).toBe('1 h 30 min');
    expect(formatDurationMs(5 * 60000, 'ru')).toBe('5 мин');
  });
});

describe('callback payloads', () => {
  it('round-trips ids and stays under the Telegram limit', () => {
    const id = 'cmf0k2x9v0000abcdefghijklm';
    const data = withId(CB.deleteConfirm, id);
    expect(idFrom(CB.deleteConfirm, data)).toBe(id);
    expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
  });
});

describe('keyboards', () => {
  it('builds the main menu with every section', () => {
    const rows = mainMenuKeyboard(dictionary('en')).inline_keyboard;
    const labels = rows.flat().map((b) => b.text);
    expect(labels).toEqual(
      expect.arrayContaining(['📡 My sites', '➕ Add site', '🚨 Incidents', '🔔 Notifications', '💳 Plan']),
    );
  });

  it('shows resume instead of pause for paused sites', () => {
    const labels = siteKeyboard(dictionary('en'), { id: 'm1', url: 'https://a.com', paused: true })
      .inline_keyboard.flat()
      .map((b) => b.text);
    expect(labels).toContain('▶️ Resume');
    expect(labels).not.toContain('⏸ Pause');
  });

  it('marks enabled notification toggles', () => {
    const labels = notificationsKeyboard(dictionary('en'), {
      websiteDowntime: true,
      websiteRecovery: false,
      sslExpiration: true,
      domainExpiration: true,
      dnsChanges: true,
    })
      .inline_keyboard.flat()
      .map((b) => b.text);
    expect(labels).toContain('✅ Site down');
    expect(labels).toContain('☐ Site recovered');
  });
});

describe('views', () => {
  const baseMonitor = {
    id: 'm1',
    userId: 'u1',
    domainId: null,
    name: 'Example',
    url: 'https://example.com',
    hostname: 'example.com',
    rootDomain: 'example.com',
    displayHostname: 'example.com',
    status: 'UP' as const,
    checkIntervalSeconds: 300,
    timeoutSeconds: 10,
    expectedStatusCodes: '200-399',
    followRedirects: true,
    consecutiveFailures: 0,
    lastCheckedAt: new Date(),
    lastSuccessfulAt: new Date(),
    currentLatencyMs: 123,
    currentHttpStatus: 200,
    lastErrorType: null,
    lastErrorMessage: null,
    nextCheckAt: new Date(),
    nextSslCheckAt: new Date(),
    nextDnsCheckAt: new Date(),
    pausedAt: null,
    lastManualCheckAt: null,
    firstCheckProgress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sslRecords: [],
    domain: null,
    incidents: [],
    dnsSnapshots: [],
  };

  it('renders the menu summary in both languages', () => {
    const monitors = [
      { status: 'UP' as const, pausedAt: null },
      { status: 'DOWN' as const, pausedAt: null },
      { status: 'UP' as const, pausedAt: new Date() },
    ];
    expect(renderMenu(en, { name: 'Demo', monitors, plan: 'FREE' })).toContain('Up: 1   🔴 Down: 1   ⏸ Paused: 1');
    expect(renderMenu(ru, { name: 'Demo', monitors, plan: 'FREE' })).toContain('Работают: 1');
  });

  it('renders a site card with uptime and escaped url', () => {
    const text = renderSite(en, {
      monitor: { ...baseMonitor, url: 'https://example.com/?a=1&b=2' },
      uptime: { h24: 99.5, d7: null, d30: 100 },
    });
    expect(text).toContain('<b>Example</b>');
    expect(text).toContain('&amp;b=2');
    expect(text).toContain('24h 99.50% · 7d — · 30d 100.00%');
    expect(text).toContain('🔒 SSL: —');
  });

  it('labels paused monitors regardless of last status', () => {
    expect(statusLabel(dictionary('en'), { status: 'DOWN', pausedAt: new Date() })).toBe('⏸ Paused');
    expect(statusLabel(dictionary('ru'), { status: 'UP', pausedAt: null })).toBe('🟢 Работает');
  });
});
