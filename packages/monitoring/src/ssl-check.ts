import tls from 'node:tls';
import { createHash } from 'node:crypto';
import { resolvePublicHost } from './ssrf.js';
import { toAsciiHostname } from './url.js';

export type SslCheckResult = {
  ok: boolean;
  issuer: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  fingerprint: string | null;
  daysRemaining: number | null;
  error: string | null;
};

export async function checkSsl(hostname: string, port = 443, timeoutMs = 10_000): Promise<SslCheckResult> {
  const ascii = toAsciiHostname(hostname);
  const resolved = await resolvePublicHost(ascii);
  const ip = resolved.addresses[0];
  if (!ip) {
    return { ok: false, issuer: null, validFrom: null, validUntil: null, fingerprint: null, daysRemaining: null, error: 'DNS error' };
  }

  return await new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: ip,
        servername: ascii,
        port,
        timeout: timeoutMs,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || Object.keys(cert).length === 0) {
          resolve(empty('No certificate presented'));
          return;
        }
        const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
        const validUntil = cert.valid_to ? new Date(cert.valid_to) : null;
        const daysRemaining =
          validUntil && Number.isFinite(validUntil.getTime())
            ? Math.floor((validUntil.getTime() - Date.now()) / 86_400_000)
            : null;
        const issuer =
          typeof cert.issuer === 'object'
            ? (cert.issuer.O as string | undefined) ?? (cert.issuer.CN as string | undefined) ?? null
            : null;
        const fingerprint = cert.fingerprint256
          ? cert.fingerprint256
          : cert.raw
            ? createHash('sha256').update(cert.raw).digest('hex')
            : null;
        resolve({
          ok: true,
          issuer,
          validFrom,
          validUntil,
          fingerprint,
          daysRemaining,
          error: null,
        });
      },
    );

    socket.on('error', (error) => {
      socket.destroy();
      resolve(empty(error.message));
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(empty('TLS handshake timed out'));
    });
  });
}

function empty(error: string): SslCheckResult {
  return {
    ok: false,
    issuer: null,
    validFrom: null,
    validUntil: null,
    fingerprint: null,
    daysRemaining: null,
    error,
  };
}
