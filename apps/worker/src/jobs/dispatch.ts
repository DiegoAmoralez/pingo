import { prisma } from '@pingo/database';
import {
  enqueueDnsCheck,
  enqueueDomainCheck,
  enqueueSslCheck,
  enqueueWebsiteCheck,
} from '@pingo/shared/jobs';

export async function processDispatch() {
  const now = new Date();

  const dueMonitors = await prisma.monitor.findMany({
    where: { pausedAt: null, nextCheckAt: { lte: now } },
    select: { id: true, nextCheckAt: true },
    take: 500,
  });
  for (const monitor of dueMonitors) {
    const claimed = await prisma.monitor.updateMany({
      where: { id: monitor.id, nextCheckAt: monitor.nextCheckAt },
      data: { nextCheckAt: new Date(now.getTime() + 60_000) },
    });
    if (claimed.count === 1) {
      await enqueueWebsiteCheck({ monitorId: monitor.id });
    }
  }

  const dueSsl = await prisma.monitor.findMany({
    where: { pausedAt: null, nextSslCheckAt: { lte: now } },
    select: { id: true, nextSslCheckAt: true },
    take: 200,
  });
  for (const monitor of dueSsl) {
    const claimed = await prisma.monitor.updateMany({
      where: { id: monitor.id, nextSslCheckAt: monitor.nextSslCheckAt },
      data: { nextSslCheckAt: new Date(now.getTime() + 60 * 60 * 1000) },
    });
    if (claimed.count === 1) {
      await enqueueSslCheck({ monitorId: monitor.id });
    }
  }

  const dueDns = await prisma.monitor.findMany({
    where: { pausedAt: null, nextDnsCheckAt: { lte: now } },
    select: { id: true, nextDnsCheckAt: true },
    take: 200,
  });
  for (const monitor of dueDns) {
    const claimed = await prisma.monitor.updateMany({
      where: { id: monitor.id, nextDnsCheckAt: monitor.nextDnsCheckAt },
      data: { nextDnsCheckAt: new Date(now.getTime() + 10 * 60 * 1000) },
    });
    if (claimed.count === 1) {
      await enqueueDnsCheck({ monitorId: monitor.id });
    }
  }

  const dueDomains = await prisma.domain.findMany({
    where: { nextCheckAt: { lte: now } },
    select: { id: true, nextCheckAt: true },
    take: 100,
  });
  for (const domain of dueDomains) {
    const claimed = await prisma.domain.updateMany({
      where: { id: domain.id, nextCheckAt: domain.nextCheckAt },
      data: { nextCheckAt: new Date(now.getTime() + 60 * 60 * 1000) },
    });
    if (claimed.count === 1) {
      await enqueueDomainCheck({ domainId: domain.id });
    }
  }
}
