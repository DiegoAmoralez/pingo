import { prisma } from '@pingo/database';
import { historyRetentionDays } from '@pingo/monitoring';
import { childLogger } from '@pingo/shared';

const log = childLogger({ job: 'cleanup' });

export async function processCleanup() {
  const users = await prisma.user.findMany({
    include: { subscription: true, monitors: { select: { id: true } } },
  });

  let deleted = 0;
  for (const user of users) {
    const days = historyRetentionDays(user.subscription?.plan ?? 'FREE');
    const cutoff = new Date(Date.now() - days * 86400000);
    const ids = user.monitors.map((m) => m.id);
    if (ids.length === 0) continue;
    const result = await prisma.monitorCheck.deleteMany({
      where: { monitorId: { in: ids }, checkedAt: { lt: cutoff } },
    });
    deleted += result.count;

    for (const monitor of user.monitors) {
      const extra = await prisma.dnsSnapshot.findMany({
        where: { monitorId: monitor.id },
        orderBy: { createdAt: 'desc' },
        skip: 20,
        select: { id: true },
      });
      if (extra.length) {
        await prisma.dnsSnapshot.deleteMany({ where: { id: { in: extra.map((s) => s.id) } } });
      }
    }
  }

  log.info({ deleted }, 'history cleanup finished');
}
