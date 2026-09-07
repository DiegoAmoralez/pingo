import Link from 'next/link';
import { StatusBadge, monitorTone } from './status-badge';
import { daysLabel, formatRelative } from '@/lib/utils';

type MonitorCardData = {
  id: string;
  displayHostname: string;
  status: string;
  currentLatencyMs: number | null;
  lastCheckedAt: Date | string | null;
  sslDays?: number | null;
  domainDays?: number | null;
  dnsLabel?: string;
};

export function MonitorCard({ monitor }: { monitor: MonitorCardData }) {
  const tone = monitorTone(monitor.status, monitor.sslDays, monitor.domainDays);
  const statusLabel =
    monitor.status === 'UP' ? 'Online' : monitor.status === 'DOWN' ? 'Down' : 'Unknown';

  return (
    <Link
      href={`/dashboard/monitors/${monitor.id}`}
      className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{monitor.displayHostname}</p>
          <div className="mt-1">
            <StatusBadge tone={tone} label={statusLabel} />
          </div>
        </div>
        <p className="text-sm text-muted">
          {monitor.currentLatencyMs != null ? `${monitor.currentLatencyMs} ms` : '—'}
        </p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Website</dt>
          <dd>{statusLabel}</dd>
        </div>
        <div>
          <dt className="text-muted">SSL</dt>
          <dd>{daysLabel(monitor.sslDays ?? null)}</dd>
        </div>
        <div>
          <dt className="text-muted">Domain</dt>
          <dd>{daysLabel(monitor.domainDays ?? null)}</dd>
        </div>
        <div>
          <dt className="text-muted">DNS</dt>
          <dd>{monitor.dnsLabel ?? 'No changes'}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted">Last check: {formatRelative(monitor.lastCheckedAt)}</p>
    </Link>
  );
}
