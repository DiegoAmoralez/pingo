import { cn } from '@/lib/utils';

const tones = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
  unknown: 'bg-stone-400',
} as const;

export function StatusBadge({
  tone,
  label,
}: {
  tone: keyof typeof tones;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      <span className={cn('h-2.5 w-2.5 rounded-full', tones[tone])} aria-hidden />
      {label}
    </span>
  );
}

export function monitorTone(status: string, sslDays?: number | null, domainDays?: number | null) {
  if (status === 'DOWN') return 'critical' as const;
  if (status === 'UNKNOWN') return 'unknown' as const;
  if ((sslDays != null && sslDays <= 14) || (domainDays != null && domainDays <= 30)) {
    return 'warning' as const;
  }
  return 'healthy' as const;
}
