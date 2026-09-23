'use client';

import { formatRelative } from '@/lib/utils';
import { useLocale } from '@/components/locale-provider';

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
  const { locale, tr } = useLocale();
  return (
    <div className="flex flex-col gap-1 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{hostname}</p>
        <p className="text-sm text-muted">{reason ?? tr('Incident', 'Событие')}</p>
      </div>
      <div className="text-sm text-muted">
        {status === 'OPEN' ? tr('Ongoing', 'Продолжается') : tr('Resolved', 'Завершено')} · {formatRelative(startedAt, 'UTC', locale)}
        {endedAt ? ` — ${formatRelative(endedAt, 'UTC', locale)}` : ''}
      </div>
    </div>
  );
}
