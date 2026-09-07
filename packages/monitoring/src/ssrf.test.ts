import { describe, expect, it } from 'vitest';
import { isBlockedHostname, isPublicIp } from './ssrf.js';

describe('SSRF IP validation', () => {
  it('blocks loopback and private ranges', () => {
    expect(isPublicIp('127.0.0.1')).toBe(false);
    expect(isPublicIp('0.0.0.0')).toBe(false);
    expect(isPublicIp('10.0.0.1')).toBe(false);
    expect(isPublicIp('172.16.5.1')).toBe(false);
    expect(isPublicIp('192.168.1.1')).toBe(false);
    expect(isPublicIp('169.254.169.254')).toBe(false);
    expect(isPublicIp('::1')).toBe(false);
    expect(isPublicIp('fc00::1')).toBe(false);
    expect(isPublicIp('fe80::1')).toBe(false);
  });

  it('blocks IPv4-mapped loopback', () => {
    expect(isPublicIp('::ffff:127.0.0.1')).toBe(false);
  });

  it('allows public addresses', () => {
    expect(isPublicIp('1.1.1.1')).toBe(true);
    expect(isPublicIp('8.8.8.8')).toBe(true);
    expect(isPublicIp('2606:4700:4700::1111')).toBe(true);
  });

  it('blocks localhost hostnames', () => {
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('foo.localhost')).toBe(true);
    expect(isBlockedHostname('metadata.google.internal')).toBe(true);
    expect(isBlockedHostname('example.com')).toBe(false);
  });
});
