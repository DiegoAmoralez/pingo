import { describe, expect, it } from 'vitest';
import { dnsChangedMessage, websiteDownMessage } from './templates.js';

describe('telegram templates', () => {
  it('formats downtime alerts', () => {
    const text = websiteDownMessage({
      hostname: 'example.com',
      http: '502 Bad Gateway',
      failedChecks: 2,
      startedAt: '14:32 UTC',
    });
    expect(text).toContain('Website down');
    expect(text).toContain('Failed checks: 2');
  });

  it('formats nameserver changes separately', () => {
    const text = dnsChangedMessage({
      hostname: 'example.com',
      type: 'NS',
      oldValues: ['ns1.oldprovider.com'],
      newValues: ['john.ns.cloudflare.com'],
    });
    expect(text).toContain('Nameservers changed');
    expect(text).toContain('Removed:');
    expect(text).toContain('Added:');
  });
});
