import { describe, expect, it } from 'vitest';
import { domainAlertThreshold, shouldEmitThresholdAlert, sslAlertThreshold } from './thresholds.js';

describe('SSL threshold calculation', () => {
  it('selects the tightest matching threshold', () => {
    expect(sslAlertThreshold(40)).toBeNull();
    expect(sslAlertThreshold(30)).toBe(30);
    expect(sslAlertThreshold(8)).toBe(14);
    expect(sslAlertThreshold(1)).toBe(1);
    expect(sslAlertThreshold(0)).toBe(0);
  });
});

describe('domain expiry thresholds', () => {
  it('matches 90/60/30/14/7/3/1 day windows', () => {
    expect(domainAlertThreshold(120)).toBeNull();
    expect(domainAlertThreshold(90)).toBe(90);
    expect(domainAlertThreshold(14)).toBe(14);
    expect(domainAlertThreshold(2)).toBe(3);
  });
});

describe('threshold alert dedupe', () => {
  it('emits once per tighter threshold', () => {
    expect(shouldEmitThresholdAlert(null, 30)).toBe(true);
    expect(shouldEmitThresholdAlert(30, 30)).toBe(false);
    expect(shouldEmitThresholdAlert(30, 14)).toBe(true);
  });
});
