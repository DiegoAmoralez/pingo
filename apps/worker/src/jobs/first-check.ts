import { prisma } from '@pingo/database';
import type { FirstCheckProgress } from '@pingo/shared';
import { processWebsiteCheck } from './website-check.js';
import { processSslCheck } from './ssl-check.js';
import { processDnsCheck } from './dns-check.js';
import { processDomainCheck } from './domain-check.js';
import { trackEvent, type FirstCheckJob } from '@pingo/shared';

export async function processFirstCheck(data: FirstCheckJob) {
  const monitor = await prisma.monitor.findUnique({ where: { id: data.monitorId } });
  if (!monitor) return;

  const progress: FirstCheckProgress = {
    website: 'pending',
    ssl: 'pending',
    dns: 'pending',
    domain: 'pending',
  };
  await saveProgress(monitor.id, progress);

  try {
    await processWebsiteCheck({ monitorId: monitor.id });
    progress.website = 'ok';
  } catch {
    progress.website = 'error';
  }
  await saveProgress(monitor.id, progress);

  try {
    await processSslCheck({ monitorId: monitor.id });
    const ssl = await prisma.sslRecord.findUnique({ where: { monitorId: monitor.id } });
    progress.ssl = ssl?.validUntil ? 'ok' : 'warn';
  } catch {
    progress.ssl = 'warn';
  }
  await saveProgress(monitor.id, progress);

  try {
    await processDnsCheck({ monitorId: monitor.id });
    progress.dns = 'ok';
  } catch {
    progress.dns = 'warn';
  }
  await saveProgress(monitor.id, progress);

  if (monitor.domainId) {
    try {
      await processDomainCheck({ domainId: monitor.domainId });
      const domain = await prisma.domain.findUnique({ where: { id: monitor.domainId } });
      progress.domain = domain?.expiresAt ? 'ok' : 'warn';
    } catch {
      progress.domain = 'warn';
    }
  } else {
    progress.domain = 'warn';
  }
  await saveProgress(monitor.id, progress);
  await trackEvent('first_check_completed', { monitorId: monitor.id }, monitor.userId);
}

async function saveProgress(monitorId: string, progress: FirstCheckProgress) {
  await prisma.monitor.update({
    where: { id: monitorId },
    data: { firstCheckProgress: progress },
  });
}
