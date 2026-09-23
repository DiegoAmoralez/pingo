import { prisma } from '@pingo/database';
import { requireUser } from '@/lib/session';
import { IncidentRow } from '@/components/incident-row';
import { EmptyState, PageHeader } from '@/components/app-primitives';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export default async function IncidentsPage() {
  const [{ user }, locale] = await Promise.all([requireUser(), getLocale()]);
  const incidents = await prisma.incident.findMany({
    where: { monitor: { userId: user.id } },
    include: { monitor: true },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader title={pick(locale, 'Incidents', 'События')} description={pick(locale, 'Outages across your monitors.', 'Сбои всех ваших мониторов.')} />
      {incidents.length === 0 ? (
        <EmptyState title={pick(locale, 'No incidents yet', 'Событий пока нет')} description={pick(locale, 'When a website goes down, the timeline will show up here.', 'Когда сайт станет недоступен, здесь появится событие.')} />
      ) : (
        <div className="rounded-2xl border border-border bg-card px-5">
          {incidents.map((incident) => (
            <IncidentRow
              key={incident.id}
              hostname={incident.monitor.displayHostname}
              reason={incident.reason}
              startedAt={incident.startedAt}
              endedAt={incident.endedAt}
              status={incident.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
