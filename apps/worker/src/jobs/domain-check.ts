import { prisma } from '@pingo/database';
import {
  daysUntil,
  domainAlertThreshold,
  domainExpiryKey,
  lookupDomain,
  shouldEmitThresholdAlert,
} from '@pingo/monitoring';
import { DOMAIN_CHECK_INTERVAL_SECONDS, childLogger, isMockMonitoring, type DomainCheckJob } from '@pingo/shared';
import { domainExpiryMessage, formatLongDate, toAlertLocale } from '@pingo/notifications';
import { queueAlert } from '../services/alerts.js';

const log = childLogger({ job: 'domain-check' });

export async function processDomainCheck(data: DomainCheckJob) {
  const domain = await prisma.domain.findUnique({
    where: { id: data.domainId },
    include: { user: { include: { preferences: true, telegram: true } }, monitors: true },
  });
  if (!domain) return;
  const locale = toAlertLocale(domain.user.telegram?.locale);

  const info = isMockMonitoring()
    ? {
        domain: domain.rootDomain,
        registrar: 'Demo Registrar',
        registeredAt: domain.registeredAt,
        expiresAt: new Date(Date.now() + 214 * 86400000),
        updatedAtRegistry: new Date(),
        status: 'active',
        nameservers: domain.nameservers,
        source: 'mock',
      }
    : await lookupDomain(domain.rootDomain);

  if (!info) {
    await prisma.domain.update({
      where: { id: domain.id },
      data: {
        lastError: 'Domain expiration unavailable',
        nextCheckAt: new Date(Date.now() + DOMAIN_CHECK_INTERVAL_SECONDS * 1000),
      },
    });
    log.info({ domainId: domain.id }, 'rdap lookup unavailable');
    return;
  }

  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  if (info.registrar && info.registrar !== domain.registrar) {
    events.push({ type: 'registrar_changed', payload: { from: domain.registrar, to: info.registrar } });
  }
  if (info.expiresAt?.toISOString() !== domain.expiresAt?.toISOString()) {
    events.push({
      type: 'expiration_changed',
      payload: { from: domain.expiresAt, to: info.expiresAt },
    });
  }
  if (info.status && info.status !== domain.status) {
    events.push({ type: 'status_changed', payload: { from: domain.status, to: info.status } });
  }
  const oldNs = [...domain.nameservers].sort().join('|');
  const newNs = [...info.nameservers].sort().join('|');
  if (oldNs !== newNs && (domain.nameservers.length > 0 || info.nameservers.length > 0) && domain.lastCheckedAt) {
    events.push({ type: 'nameservers_changed', payload: { from: domain.nameservers, to: info.nameservers } });
  }

  if (events.length) {
    await prisma.domainEvent.createMany({
      data: events.map((event) => ({
        domainId: domain.id,
        type: event.type,
        payload: event.payload as object,
      })),
    });
  }

  const remaining = daysUntil(info.expiresAt);
  const threshold = domainAlertThreshold(remaining);

  await prisma.domain.update({
    where: { id: domain.id },
    data: {
      registrar: info.registrar,
      registeredAt: info.registeredAt,
      expiresAt: info.expiresAt,
      updatedAtRegistry: info.updatedAtRegistry,
      status: info.status,
      nameservers: info.nameservers,
      rdapSource: info.source,
      lastCheckedAt: new Date(),
      lastError: info.expiresAt ? null : 'Domain expiration unavailable',
      nextCheckAt: new Date(Date.now() + DOMAIN_CHECK_INTERVAL_SECONDS * 1000),
      provider: 'rdap',
    },
  });

  if (
    threshold != null &&
    info.expiresAt &&
    shouldEmitThresholdAlert(domain.lastAlertThreshold, threshold) &&
    domain.user.preferences?.domainExpiration !== false
  ) {
    await queueAlert({
      userId: domain.userId,
      monitorId: domain.monitors[0]?.id,
      type: 'DOMAIN_EXPIRY',
      deduplicationKey: domainExpiryKey(domain.id, threshold),
      text: domainExpiryMessage({
        domain: domain.displayDomain,
        days: threshold,
        registrar: info.registrar,
        expiration: formatLongDate(info.expiresAt, locale),
        locale,
      }),
    });
    await prisma.domain.update({
      where: { id: domain.id },
      data: { lastAlertThreshold: threshold },
    });
  }

  log.info({ domainId: domain.id, remaining }, 'domain check finished');
}
