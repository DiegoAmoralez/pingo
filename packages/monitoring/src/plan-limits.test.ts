import { describe, expect, it } from 'vitest';
import { PlanLimitError } from '@pingo/shared';
import { dnsChangeKey, siteDownKey, sslExpiryKey } from './dedupe.js';
import { assertCanCreateMonitor, clampCheckInterval } from './plan-limits.js';
import { diffDns } from './dns-check.js';

describe('plan limits', () => {
  it('blocks a third active monitor on FREE', () => {
    expect(() => assertCanCreateMonitor({ plan: 'FREE', activeMonitorCount: 2 })).toThrow(
      PlanLimitError,
    );
  });

  it('clamps check interval to the plan minimum', () => {
    expect(clampCheckInterval('FREE', 60)).toBe(300);
    expect(clampCheckInterval('PERSONAL', 60)).toBe(60);
  });
});

describe('notification deduplication keys', () => {
  it('is unique per incident and threshold', () => {
    expect(siteDownKey('m1', 'i1')).toBe('site-down:m1:i1');
    expect(sslExpiryKey('m1', 7)).toBe('ssl-expiry:m1:7');
    expect(dnsChangeKey('m1', 's1')).toBe('dns-change:m1:s1');
  });
});

describe('DNS change detection', () => {
  it('detects A record replacements', () => {
    const changes = diffDns(
      { A: ['104.21.12.10'], AAAA: [], CNAME: [], MX: [], NS: [], TXT: [] },
      { A: ['172.67.15.44'], AAAA: [], CNAME: [], MX: [], NS: [], TXT: [] },
    );
    expect(changes).toEqual([
      { type: 'A', oldValues: ['104.21.12.10'], newValues: ['172.67.15.44'] },
    ]);
  });

  it('detects nameserver additions and removals', () => {
    const changes = diffDns(
      { A: [], AAAA: [], CNAME: [], MX: [], NS: ['ns1.oldprovider.com'], TXT: [] },
      { A: [], AAAA: [], CNAME: [], MX: [], NS: ['john.ns.cloudflare.com'], TXT: [] },
    );
    expect(changes[0]?.type).toBe('NS');
  });
});
