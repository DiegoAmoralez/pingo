import Link from 'next/link';
import { StatusBadge, monitorTone } from './status-badge';
import { cn, daysLabel, formatRelative } from '@/lib/utils';
import { ChevronRight, Globe2, LockKeyhole } from 'lucide-react';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

const dotTone = {
  healthy: 'bg-ok ring-emerald-50',
  warning: 'bg-warn ring-amber-50',
  critical: 'bg-crit ring-red-50',
  unknown: 'bg-unknown ring-stone-100',
};

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

export async function MonitorCard({ monitor }: { monitor: MonitorCardData }) {
  const locale = await getLocale();
  const tone = monitorTone(monitor.status, monitor.sslDays, monitor.domainDays);
  const statusLabel =
    monitor.status === 'UP' ? pick(locale, 'Online', 'Доступен') : monitor.status === 'DOWN' ? pick(locale, 'Down', 'Недоступен') : pick(locale, 'Unknown', 'Неизвестно');

  return (
    <Link
      href={`/dashboard/monitors/${monitor.id}`}
      className="brand-card group block rounded-2xl p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-md sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className={cn('h-3 w-3 shrink-0 rounded-full ring-4', dotTone[tone])} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{monitor.displayHostname}</p>
          <p className="mt-0.5 truncate text-xs text-muted">https://{monitor.displayHostname}</p>
        </div>
        <div className="hidden sm:block">
          <StatusBadge tone={tone} label={statusLabel} />
        </div>
        <p className="text-sm font-bold">
          {monitor.currentLatencyMs != null ? `${monitor.currentLatencyMs} ms` : '—'}
        </p>
        <ChevronRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1" />
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-4 border-t border-border pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{pick(locale, 'Last 10 checks', 'Последние 10 проверок')}</p>
          <div className="status-bars mt-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <span key={index} className={monitor.status === 'DOWN' && index === 9 ? '!bg-crit' : undefined} />
            ))}
          </div>
        </div>
        <p className="text-right text-xs text-muted">
          {pick(locale, 'Checked', 'Проверено')} {formatRelative(monitor.lastCheckedAt, 'UTC', locale)}
        </p>
      </div>
      <dl className="mt-4 flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5">
          <LockKeyhole className="h-3.5 w-3.5 text-accent" />
          <dt className="sr-only">SSL</dt>
          <dd>SSL {daysLabel(monitor.sslDays ?? null, locale)}</dd>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5">
          <Globe2 className="h-3.5 w-3.5 text-accent" />
          <dt className="sr-only">{pick(locale, 'Domain', 'Домен')}</dt>
          <dd>{pick(locale, 'Domain', 'Домен')} {daysLabel(monitor.domainDays ?? null, locale)}</dd>
        </div>
        <div className="rounded-full bg-background px-3 py-1.5">
          <dt className="sr-only">DNS</dt>
          <dd>DNS · {monitor.dnsLabel ?? pick(locale, 'No changes', 'Без изменений')}</dd>
        </div>
      </dl>
    </Link>
  );
}
