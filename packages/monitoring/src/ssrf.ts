import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { toAsciiHostname } from './url.js';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google.com',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

const BLOCKED_RANGES = new Set([
  'unspecified',
  'broadcast',
  'multicast',
  'linkLocal',
  'loopback',
  'reserved',
  'benchmarking',
  'carrierGradeNat',
  'private',
  'uniqueLocal',
]);

export type ResolvedHost = {
  hostname: string;
  addresses: string[];
};

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '').toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (host === '0' || host.startsWith('0.')) return true;
  return false;
}

export function isPublicIp(ip: string): boolean {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(ip);
  } catch {
    return false;
  }

  if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    parsed = (parsed as ipaddr.IPv6).toIPv4Address();
  }

  const range = parsed.range();
  if (BLOCKED_RANGES.has(range)) return false;
  return true;
}

export function assertPublicIps(addresses: string[]): void {
  if (addresses.length === 0) {
    throw Object.assign(new Error('Hostname did not resolve'), { category: 'DNS_ERROR' });
  }
  for (const address of addresses) {
    if (!isPublicIp(address)) {
      throw Object.assign(new Error('URL resolves to a private or reserved address'), {
        category: 'SSRF_BLOCKED',
      });
    }
  }
}

export async function resolvePublicHost(hostname: string): Promise<ResolvedHost> {
  const ascii = toAsciiHostname(hostname);

  if (isIP(ascii)) {
    if (!isPublicIp(ascii)) {
      throw Object.assign(new Error('Direct IP addresses in private ranges are not allowed'), {
        category: 'SSRF_BLOCKED',
      });
    }
    return { hostname: ascii, addresses: [ascii] };
  }

  if (isBlockedHostname(ascii)) {
    throw Object.assign(new Error('This hostname is not allowed'), { category: 'SSRF_BLOCKED' });
  }

  const resolver = new Resolver();
  resolver.setServers(resolver.getServers());

  const addresses = new Set<string>();
  try {
    const v4 = await resolver.resolve4(ascii);
    for (const ip of v4) addresses.add(ip);
  } catch (error) {
    if (!isDnsNotFound(error)) {
      throw Object.assign(new Error('DNS lookup failed'), { category: 'DNS_ERROR', cause: error });
    }
  }
  try {
    const v6 = await resolver.resolve6(ascii);
    for (const ip of v6) addresses.add(ip);
  } catch (error) {
    if (!isDnsNotFound(error) && addresses.size === 0) {
      throw Object.assign(new Error('DNS lookup failed'), { category: 'DNS_ERROR', cause: error });
    }
  }

  const list = [...addresses];
  assertPublicIps(list);
  return { hostname: ascii, addresses: list };
}

function isDnsNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOTFOUND' || error.code === 'ENODATA' || error.code === 'EREFUSED')
  );
}
