import { prisma } from '@pingo/database';
import { diffDns, dnsChangeKey, lookupDns, nsChangeKey } from '@pingo/monitoring';
import type { DnsRecords } from '@pingo/shared';
import { DNS_CHECK_INTERVAL_SECONDS, childLogger, isMockMonitoring, type DnsCheckJob } from '@pingo/shared';
import { dnsChangedMessage } from '@pingo/notifications';
import { queueAlert } from '../services/alerts.js';

const log = childLogger({ job: 'dns-check' });

export async function processDnsCheck(data: DnsCheckJob) {
  const monitor = await prisma.monitor.findUnique({
    where: { id: data.monitorId },
    include: {
      dnsSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
      user: { include: { preferences: true } },
    },
  });
  if (!monitor || monitor.pausedAt) return;

  const records = isMockMonitoring()
    ? { A: ['93.184.216.34'], AAAA: [], CNAME: [], MX: [], NS: ['a.iana-servers.net'], TXT: [] }
    : await lookupDns(monitor.hostname);

  const previous = monitor.dnsSnapshots[0]?.records as DnsRecords | undefined;
  const snapshot = await prisma.dnsSnapshot.create({
    data: { monitorId: monitor.id, records },
  });

  if (previous && monitor.user.preferences?.dnsChanges !== false) {
    const changes = diffDns(previous, records);
    for (const change of changes) {
      const type = change.type === 'NS' ? 'NS_CHANGED' : 'DNS_CHANGED';
      await queueAlert({
        userId: monitor.userId,
        monitorId: monitor.id,
        type,
        deduplicationKey:
          change.type === 'NS' ? nsChangeKey(monitor.id, snapshot.id) : dnsChangeKey(monitor.id, `${snapshot.id}:${change.type}`),
        text: dnsChangedMessage({
          hostname: monitor.displayHostname,
          type: change.type,
          oldValues: change.oldValues,
          newValues: change.newValues,
        }),
      });
    }
  }

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { nextDnsCheckAt: new Date(Date.now() + DNS_CHECK_INTERVAL_SECONDS * 1000) },
  });

  log.info({ monitorId: monitor.id, snapshotId: snapshot.id }, 'dns check finished');
}
