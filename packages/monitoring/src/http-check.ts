import { Agent, fetch, type Dispatcher } from 'undici';
import type { LookupAddress, LookupOptions } from 'node:dns';
import { isIP } from 'node:net';
import {
  DEFAULT_TIMEOUT_SECONDS,
  MAX_REDIRECTS,
  MAX_RESPONSE_BYTES,
  type ErrorCategory,
} from '@pingo/shared';
import { classifyNetworkError } from './classify-error.js';
import { isExpectedStatus, parseExpectedStatusCodes } from './status-codes.js';
import { resolvePublicHost } from './ssrf.js';
import { normalizeMonitorUrl } from './url.js';

export type HttpCheckInput = {
  url: string;
  timeoutSeconds?: number;
  followRedirects?: boolean;
  expectedStatusCodes?: string;
};

export type HttpCheckResult = {
  status: 'UP' | 'DOWN';
  httpStatus: number | null;
  latencyMs: number;
  errorType: ErrorCategory | null;
  errorMessage: string | null;
  redirectTarget: string | null;
  finalUrl: string;
};

export async function checkHttp(input: HttpCheckInput): Promise<HttpCheckResult> {
  const started = Date.now();
  try {
    const normalized = normalizeMonitorUrl(input.url);
    const expected = parseExpectedStatusCodes(input.expectedStatusCodes ?? '200-399');
    const timeoutMs = (input.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * 1000;
    const follow = input.followRedirects ?? true;

    let currentUrl = normalized.url;
    let redirectTarget: string | null = null;
    let lastStatus: number | null = null;

    for (let hop = 0; hop <= (follow ? MAX_REDIRECTS : 0); hop += 1) {
      const target = new URL(currentUrl);
      if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        return down(started, 'REDIRECT_ERROR', 'Redirect used a disallowed protocol', lastStatus, redirectTarget);
      }
      if (target.username || target.password) {
        return down(started, 'SSRF_BLOCKED', 'Redirect contained credentials', lastStatus, redirectTarget);
      }

      const resolved = await resolvePublicHost(target.hostname);
      const result = await requestOnce(target, resolved.addresses, timeoutMs, hop === 0);

      lastStatus = result.status;
      if (result.redirectUrl) {
        if (!follow) {
          break;
        }
        if (hop === MAX_REDIRECTS) {
          return down(started, 'REDIRECT_ERROR', 'Too many redirects', lastStatus, result.redirectUrl);
        }
        redirectTarget = result.redirectUrl;
        currentUrl = new URL(result.redirectUrl, currentUrl).toString();
        continue;
      }

      const ok = isExpectedStatus(result.status, expected);
      if (!ok) {
        return {
          status: 'DOWN',
          httpStatus: result.status,
          latencyMs: Date.now() - started,
          errorType: 'HTTP_ERROR',
          errorMessage: `HTTP ${result.status}`,
          redirectTarget,
          finalUrl: currentUrl,
        };
      }

      return {
        status: 'UP',
        httpStatus: result.status,
        latencyMs: Date.now() - started,
        errorType: null,
        errorMessage: null,
        redirectTarget,
        finalUrl: currentUrl,
      };
    }

    return down(started, 'REDIRECT_ERROR', 'Too many redirects', lastStatus, redirectTarget);
  } catch (error) {
    const classified = classifyNetworkError(error);
    return {
      status: 'DOWN',
      httpStatus: null,
      latencyMs: Date.now() - started,
      errorType: classified.category,
      errorMessage: classified.message,
      redirectTarget: null,
      finalUrl: input.url,
    };
  }
}

function down(
  started: number,
  errorType: ErrorCategory,
  errorMessage: string,
  httpStatus: number | null,
  redirectTarget: string | null,
): HttpCheckResult {
  return {
    status: 'DOWN',
    httpStatus,
    latencyMs: Date.now() - started,
    errorType,
    errorMessage,
    redirectTarget,
    finalUrl: '',
  };
}

async function requestOnce(
  url: URL,
  addresses: string[],
  timeoutMs: number,
  tryHeadFirst: boolean,
): Promise<{ status: number; redirectUrl: string | null }> {
  const dispatcher = createPinnedDispatcher(addresses);
  const methods: Array<'HEAD' | 'GET'> = tryHeadFirst ? ['HEAD', 'GET'] : ['GET'];

  try {
    let lastStatus = 0;
    for (const method of methods) {
      const response = await fetch(url, {
        method,
        dispatcher,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'user-agent': 'PINGO-Monitor/1.0 (+https://pingo.app)',
          accept: '*/*',
        },
      });

      lastStatus = response.status;
      await drainBody(response);

      if (method === 'HEAD' && (response.status === 405 || response.status === 501)) {
        continue;
      }

      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        return { status: response.status, redirectUrl: location };
      }

      return { status: response.status, redirectUrl: null };
    }

    return { status: lastStatus, redirectUrl: null };
  } finally {
    await dispatcher.close();
  }
}

function pinAddresses(addresses: string[]): LookupAddress[] {
  const unique = [...new Set(addresses)];
  const v4 = unique.filter((address) => isIP(address) === 4);
  const v6 = unique.filter((address) => isIP(address) === 6);
  return [...v4, ...v6].map((address) => ({
    address,
    family: isIP(address) === 6 ? 6 : 4,
  }));
}

function createPinnedDispatcher(addresses: string[]): Dispatcher {
  const mapped = pinAddresses(addresses);
  return new Agent({
    connect: {
      lookup(_hostname: string, options: LookupOptions, callback) {
        if (mapped.length === 0) {
          const error = Object.assign(new Error('Hostname did not resolve'), { code: 'ENOTFOUND' });
          callback(error, '', 4);
          return;
        }
        // Node's net/tls connect always uses dns.lookup({ all: true }).
        // A (address, family) callback is treated as a string of characters and the request fails as UNKNOWN.
        if (options.all === false) {
          callback(null, mapped[0]!.address, mapped[0]!.family);
          return;
        }
        callback(null, mapped);
      },
    },
    headersTimeout: 10_000,
    bodyTimeout: 10_000,
    maxHeaderSize: 32768,
  });
}

async function drainBody(response: { body?: { getReader(): ReadableStreamDefaultReader<Uint8Array> } | null }): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value?.byteLength ?? 0;
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        break;
      }
    }
  } catch {
    await reader.cancel().catch(() => undefined);
  }
}
