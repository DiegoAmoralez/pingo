import { domainToASCII, domainToUnicode } from 'node:url';
import { parse } from 'tldts';
import { MAX_URL_LENGTH } from '@pingo/shared';

export type NormalizedTarget = {
  url: string;
  hostname: string;
  displayHostname: string;
  rootDomain: string;
  displayRootDomain: string;
  port: number | null;
  protocol: 'http:' | 'https:';
  pathname: string;
};

const BLOCKED_PROTOCOLS = new Set(['file:', 'ftp:', 'gopher:', 'data:', 'javascript:', 'blob:']);

export function normalizeMonitorUrl(raw: string): NormalizedTarget {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new Error('URL is too long');
  }

  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Invalid URL');
  }

  if (BLOCKED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }
  if (!parsed.hostname) {
    throw new Error('URL must include a hostname');
  }

  const asciiHost = toAsciiHostname(parsed.hostname);
  parsed.hostname = asciiHost;

  const tld = parse(asciiHost, { allowPrivateDomains: true });
  if (!tld.domain) {
    throw new Error('Could not determine a registrable domain');
  }

  const rootDomain = (tld.domain ?? asciiHost).toLowerCase();
  const displayHost = domainToUnicode(asciiHost);
  const displayRoot = domainToUnicode(rootDomain);

  return {
    url: parsed.toString(),
    hostname: asciiHost.toLowerCase(),
    displayHostname: displayHost,
    rootDomain,
    displayRootDomain: displayRoot,
    port: parsed.port ? Number(parsed.port) : null,
    protocol: parsed.protocol as 'http:' | 'https:',
    pathname: parsed.pathname,
  };
}

export function toAsciiHostname(hostname: string): string {
  const ascii = domainToASCII(hostname.replace(/\.$/, '').toLowerCase());
  if (!ascii) {
    throw new Error('Invalid hostname');
  }
  return ascii;
}

export function getRegistrableDomain(hostname: string): string {
  const ascii = toAsciiHostname(hostname);
  const tld = parse(ascii, { allowPrivateDomains: true });
  if (!tld.domain) {
    throw new Error('Could not determine a registrable domain');
  }
  return tld.domain.toLowerCase();
}
