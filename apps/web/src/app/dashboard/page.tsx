import { prisma } from '@pingo/database';
import { requireUser } from '@/lib/session';
import { MonitorCard } from '@/components/monitor-card';
import { EmptyState, PageHeader } from '@/components/app-primitives';
import { AddMonitorButton } from '@/components/add-monitor-button';

export default async function DashboardPage() {
  const { user } = await requireUser();
  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    include: { sslRecords: true, domain: true },
    orderBy: { createdAt: 'asc' },
  });

  const attention = monitors.filter((m) => m.status === 'DOWN' || m.pausedAt).length;
  const headline =
    monitors.length === 0
      ? 'Nothing to monitor yet'
      : attention > 0
        ? `${attention} monitor${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} attention`
        : 'All systems operational';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={headline}
        actions={<AddMonitorButton />}
      />
      {monitors.length === 0 ? (
        <EmptyState
          title="Nothing to monitor yet"
          description="Add your first website and PINGO will start watching it immediately."
          action={<AddMonitorButton label="Add website" />}
        />
      ) : (
        <div className="grid gap-4">
          {monitors.map((monitor) => {
            const domainDays = monitor.domain?.expiresAt
              ? Math.floor((monitor.domain.expiresAt.getTime() - Date.now()) / 86400000)
              : null;
            return (
              <MonitorCard
                key={monitor.id}
                monitor={{
                  id: monitor.id,
                  displayHostname: monitor.displayHostname,
                  status: monitor.pausedAt ? 'UNKNOWN' : monitor.status,
                  currentLatencyMs: monitor.currentLatencyMs,
                  lastCheckedAt: monitor.lastCheckedAt,
                  sslDays: monitor.sslRecords[0]?.daysRemaining ?? null,
                  domainDays,
                  dnsLabel: 'No changes',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
