import { prisma } from '@pingo/database';
import { checkSsl, shouldEmitThresholdAlert, sslAlertThreshold, sslExpiryKey } from '@pingo/monitoring';
import {
  SSL_CHECK_INTERVAL_SECONDS,
  childLogger,
  isMockMonitoring,
  type SslCheckJob,
} from '@pingo/shared';
import { formatLongDate, sslExpiryMessage } from '@pingo/notifications';
import { queueAlert } from '../services/alerts.js';

const log = childLogger({ job: 'ssl-check' });

export async function processSslCheck(data: SslCheckJob) {
  const monitor = await prisma.monitor.findUnique({
    where: { id: data.monitorId },
    include: { sslRecords: true, user: { include: { preferences: true } } },
  });
  if (!monitor || monitor.pausedAt) return;

  const result = isMockMonitoring()
    ? {
        ok: true,
        issuer: 'Demo CA',
        validFrom: new Date(Date.now() - 30 * 86400000),
        validUntil: new Date(Date.now() + 73 * 86400000),
        fingerprint: 'mock',
        daysRemaining: 73,
        error: null,
      }
    : await checkSsl(monitor.hostname, 443, monitor.timeoutSeconds * 1000);

  const existing = monitor.sslRecords[0];
  const threshold = sslAlertThreshold(result.daysRemaining);

  await prisma.sslRecord.upsert({
    where: { monitorId: monitor.id },
    create: {
      monitorId: monitor.id,
      issuer: result.issuer,
      validFrom: result.validFrom,
      validUntil: result.validUntil,
      fingerprint: result.fingerprint,
      daysRemaining: result.daysRemaining,
      lastAlertThreshold: existing?.lastAlertThreshold ?? null,
      checkedAt: new Date(),
    },
    update: {
      issuer: result.issuer,
      validFrom: result.validFrom,
      validUntil: result.validUntil,
      fingerprint: result.fingerprint,
      daysRemaining: result.daysRemaining,
      checkedAt: new Date(),
    },
  });

  if (
    result.ok &&
    threshold != null &&
    shouldEmitThresholdAlert(existing?.lastAlertThreshold, threshold) &&
    monitor.user.preferences?.sslExpiration !== false
  ) {
    await queueAlert({
      userId: monitor.userId,
      monitorId: monitor.id,
      type: 'SSL_EXPIRY',
      deduplicationKey: sslExpiryKey(monitor.id, threshold),
      text: sslExpiryMessage({
        hostname: monitor.displayHostname,
        days: threshold,
        expiration: result.validUntil ? formatLongDate(result.validUntil) : 'unknown',
      }),
    });
    await prisma.sslRecord.update({
      where: { monitorId: monitor.id },
      data: { lastAlertThreshold: threshold },
    });
  }

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { nextSslCheckAt: new Date(Date.now() + SSL_CHECK_INTERVAL_SECONDS * 1000) },
  });

  log.info({ monitorId: monitor.id, daysRemaining: result.daysRemaining, ok: result.ok }, 'ssl check finished');
}
