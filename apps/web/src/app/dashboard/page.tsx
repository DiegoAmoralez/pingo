import { prisma } from '@pingo/database';
import { requireUser } from '@/lib/session';
import { MonitorCard } from '@/components/monitor-card';
import { EmptyState, PageHeader } from '@/components/app-primitives';
import { AddMonitorButton } from '@/components/add-monitor-button';
import { AlertTriangle, MonitorCheck } from 'lucide-react';
import { getLocale } from '@/lib/i18n-server';
import { pick, pluralRu } from '@/lib/i18n';

export default async function DashboardPage() {
  const [{ user }, locale] = await Promise.all([requireUser(), getLocale()]);
  const t = (en: string, ru: string) => pick(locale, en, ru);
  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    include: { sslRecords: true, domain: true },
    orderBy: { createdAt: 'asc' },
  });

  const attention = monitors.filter((m) => m.status === 'DOWN' || m.pausedAt).length;
  const headline =
    monitors.length === 0
      ? t('Nothing to monitor yet', 'Пока нечего отслеживать')
      : attention > 0
        ? t(
            `${attention} monitor${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} attention`,
            `${attention} ${pluralRu(attention, 'монитор требует', 'монитора требуют', 'мониторов требуют')} внимания`,
          )
        : t('All systems operational', 'Все системы работают');

  return (
    <div className="space-y-7">
      <PageHeader
        title={t('My websites', 'Мои сайты')}
        description={headline}
        actions={<AddMonitorButton />}
      />
      {monitors.length > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="brand-card flex items-center gap-4 rounded-2xl p-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-soft-lime text-accent">
                <MonitorCheck className="h-5 w-5" />
              </span>
              <div><p className="text-2xl font-extrabold">{monitors.length}</p><p className="text-xs text-muted">{t('sites under watch', pluralRu(monitors.length, 'сайт под наблюдением', 'сайта под наблюдением', 'сайтов под наблюдением'))}</p></div>
            </div>
            <div className="brand-card flex items-center gap-4 rounded-2xl p-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-warn">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div><p className="text-2xl font-extrabold">{attention}</p><p className="text-xs text-muted">{t('need attention', 'требуют внимания')}</p></div>
            </div>
          </div>
        </>
      ) : null}
      {monitors.length === 0 ? (
        <EmptyState
          title={t('Nothing to monitor yet', 'Пока нечего отслеживать')}
          description={t('Add your first website and PingoGo will start watching it immediately.', 'Добавьте первый сайт, и PingoGo сразу начнёт за ним следить.')}
          action={<AddMonitorButton label={t('Add website', 'Добавить сайт')} />}
        />
      ) : (
        <div className="grid gap-3">
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
                  dnsLabel: t('No changes', 'Без изменений'),
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
