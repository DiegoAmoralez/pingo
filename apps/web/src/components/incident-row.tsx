import { formatRelative } from '@/lib/utils';

export function IncidentRow({
  hostname,
  reason,
  startedAt,
  endedAt,
  status,
}: {
  hostname: string;
  reason: string | null;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{hostname}</p>
        <p className="text-sm text-muted">{reason ?? 'Incident'}</p>
      </div>
      <div className="text-sm text-muted">
        {status === 'OPEN' ? 'Ongoing' : 'Resolved'} · {formatRelative(startedAt)}
        {endedAt ? ` → ${formatRelative(endedAt)}` : ''}
      </div>
    </div>
  );
}
