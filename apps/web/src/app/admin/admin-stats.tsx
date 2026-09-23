import { prisma } from '@pingo/database';
import { getPlan } from '@pingo/shared';
import { MetricCard } from '@/components/app-primitives';
import { pick, type Locale } from '@/lib/i18n';

/** Product health and billing snapshot shown on the admin panel. */
export async function AdminStats({ locale }: { locale: Locale }) {
  const t = (en: string, ru: string) => pick(locale, en, ru);
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
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t('Total users', 'Всего пользователей')} value={String(users)} />
        <MetricCard label={t('New 7d / 30d', 'Новые за 7 / 30 дней')} value={`${new7} / ${new30}`} />
        <MetricCard label={t('Paid users', 'Платные пользователи')} value={String(paid.length)} />
        <MetricCard label="MRR" value={`$${mrr.toFixed(2)}`} />
        <MetricCard label={t('Active monitors', 'Активные мониторы')} value={String(monitors)} />
        <MetricCard
          label={t('Telegram connected', 'Telegram подключён')}
          value={users ? `${Math.round((telegram / users) * 100)}%` : '0%'}
        />
        <MetricCard label={t('Incidents 24h', 'События за 24 ч.')} value={String(incidents24)} />
        <MetricCard
          label={t('Worker heartbeat', 'Состояние worker')}
          value={heartbeat ? new Date(heartbeat.updatedAt).toLocaleTimeString() : t('missing', 'нет данных')}
        />
        <MetricCard label={t('Telegram errors 24h', 'Ошибки Telegram за 24 ч.')} value={String(failedNotifications)} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">{t('Users', 'Пользователи')}</h2>
        <div className="mt-4 overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="text-muted">
                <th className="py-2">Email</th>
                <th>{t('Plan', 'Тариф')}</th>
                <th>{t('Monitors', 'Мониторы')}</th>
                <th>{t('Status', 'Статус')}</th>
                <th>{t('Created', 'Создан')}</th>
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
        <h2 className="font-semibold">{t('Monitors', 'Мониторы')}</h2>
        <div className="mt-4 overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="text-muted">
                <th className="py-2">{t('Domain', 'Домен')}</th>
                <th>{t('Status', 'Статус')}</th>
                <th>{t('Owner', 'Владелец')}</th>
                <th>{t('Last check', 'Последняя проверка')}</th>
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
    </>
  );
}
