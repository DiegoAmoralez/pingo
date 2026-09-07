import { prisma } from '@pingo/database';
import { requireUser } from '@/lib/session';
import { IncidentRow } from '@/components/incident-row';
import { EmptyState, PageHeader } from '@/components/app-primitives';

export default async function IncidentsPage() {
  const { user } = await requireUser();
  const incidents = await prisma.incident.findMany({
    where: { monitor: { userId: user.id } },
    include: { monitor: true },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Incidents" description="Outages across your monitors." />
      {incidents.length === 0 ? (
        <EmptyState title="No incidents yet" description="When a website goes down, the timeline will show up here." />
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
