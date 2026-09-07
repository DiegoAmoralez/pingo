import { prisma } from '@pingo/database';
import { requireAdmin } from '@/lib/session';
import { AppShell } from '@/components/app-shell';
import { MetricCard, PageHeader } from '@/components/app-primitives';
import { getPlan } from '@pingo/shared';

export default async function AdminPage() {
  const { user } = await requireAdmin();
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const h24 = new Date(now.getTime() - 86400000);

  const [
    users,
    new7,
    new30,
    paid,
    monitors,
    incidents24,
    telegram,
    heartbeat,
    failedNotifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.subscription.findMany({ where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } } }),
    prisma.monitor.count({ where: { pausedAt: null } }),
    prisma.incident.count({ where: { startedAt: { gte: h24 } } }),
    prisma.telegramConnection.count(),
    prisma.workerHeartbeat.findUnique({ where: { id: 'primary' } }),
    prisma.notificationEvent.count({ where: { status: 'FAILED', createdAt: { gte: h24 } } }),
  ]);

  const mrr = paid.reduce((sum, sub) => sum + getPlan(sub.plan).monthlyPriceCents, 0) / 100;
  const allUsers = await prisma.user.findMany({
    include: { subscription: true, _count: { select: { monitors: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const allMonitors = await prisma.monitor.findMany({
    include: { user: true },
    orderBy: { lastCheckedAt: 'desc' },
    take: 50,
  });

  return (
    <AppShell email={user.email} isAdmin>
      <div className="space-y-8">
        <PageHeader title="Admin" description="Product health and billing snapshot." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total users" value={String(users)} />
          <MetricCard label="New 7d / 30d" value={`${new7} / ${new30}`} />
          <MetricCard label="Paid users" value={String(paid.length)} />
          <MetricCard label="MRR" value={`$${mrr.toFixed(2)}`} />
          <MetricCard label="Active monitors" value={String(monitors)} />
          <MetricCard
            label="Telegram connected"
            value={users ? `${Math.round((telegram / users) * 100)}%` : '0%'}
          />
          <MetricCard label="Incidents 24h" value={String(incidents24)} />
          <MetricCard
            label="Worker heartbeat"
            value={heartbeat ? new Date(heartbeat.updatedAt).toLocaleTimeString() : 'missing'}
          />
          <MetricCard label="Telegram errors 24h" value={String(failedNotifications)} />
        </div>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Users</h2>
          <div className="mt-4 overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="text-muted">
                  <th className="py-2">Email</th>
                  <th>Plan</th>
                  <th>Monitors</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2">{row.email}</td>
                    <td>{row.subscription?.plan ?? 'FREE'}</td>
                    <td>{row._count.monitors}</td>
                    <td>{row.subscription?.status ?? 'NONE'}</td>
                    <td>{row.createdAt.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Monitors</h2>
          <div className="mt-4 overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="text-muted">
                  <th className="py-2">Domain</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Last check</th>
                </tr>
              </thead>
              <tbody>
                {allMonitors.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2">{row.displayHostname}</td>
                    <td>{row.status}</td>
                    <td>{row.user.email}</td>
                    <td>{row.lastCheckedAt?.toISOString() ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
