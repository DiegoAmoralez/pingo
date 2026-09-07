import { describe, expect, it } from 'vitest';
import { getRegistrableDomain, normalizeMonitorUrl } from './url.js';

describe('URL normalization', () => {
  it('adds https and keeps the full URL', () => {
    const result = normalizeMonitorUrl('example.com');
    expect(result.url).toBe('https://example.com/');
    expect(result.hostname).toBe('example.com');
    expect(result.rootDomain).toBe('example.com');
  });

  it('strips credentials and rejects them', () => {
    expect(() => normalizeMonitorUrl('https://user:pass@example.com')).toThrow(/credentials/);
  });

  it('rejects non-http protocols', () => {
    expect(() => normalizeMonitorUrl('file:///etc/passwd')).toThrow(/http/);
    expect(() => normalizeMonitorUrl('ftp://example.com')).toThrow(/http/);
  });

  it('keeps path on website monitor URL', () => {
    const result = normalizeMonitorUrl('https://example.com/test?id=5');
    expect(result.url).toContain('/test?id=5');
    expect(result.hostname).toBe('example.com');
  });

  it('normalizes www host independently of root domain', () => {
    const result = normalizeMonitorUrl('https://www.example.com');
    expect(result.hostname).toBe('www.example.com');
    expect(result.rootDomain).toBe('example.com');
  });

  it('converts IDN to punycode', () => {
    const result = normalizeMonitorUrl('https://пример.рф');
    expect(result.hostname).toContain('xn--');
    expect(result.displayHostname).toBe('пример.рф');
  });
});

describe('root domain detection', () => {
  it('maps shop.example.co.uk to example.co.uk', () => {
    expect(getRegistrableDomain('shop.example.co.uk')).toBe('example.co.uk');
  });

  it('maps api.example.com to example.com', () => {
    expect(getRegistrableDomain('api.example.com')).toBe('example.com');
  });
});
