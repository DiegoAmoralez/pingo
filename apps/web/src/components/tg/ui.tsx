'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { MonitorStatus } from './api';

export function Section({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mx-4 mb-4', className)}>
      {title ? <h2 className="tg-hint mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.14em]">{title}</h2> : null}
      <div className="tg-section overflow-hidden">{children}</div>
    </section>
  );
}

export function Row({
  label,
  value,
  hint,
  onClick,
  trailing,
  leading,
  destructive,
}: {
  label: ReactNode;
  value?: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
  trailing?: ReactNode;
  leading?: ReactNode;
  destructive?: boolean;
}) {
  const content = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-[15px] font-medium', destructive && 'tg-destructive')}>{label}</div>
        {hint ? <div className="tg-hint mt-0.5 truncate text-[13px]">{hint}</div> : null}
      </div>
      {value !== undefined ? <div className="tg-hint shrink-0 text-right text-[14px] tabular-nums">{value}</div> : null}
      {trailing}
      {onClick && trailing === undefined ? <Chevron /> : null}
    </>
  );
  const className = 'tg-row flex w-full items-center gap-3 px-4 py-3 text-left';
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, 'tg-pressable')} tabIndex={0}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

export function Chevron() {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden className="tg-hint shrink-0 opacity-60">
      <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn('tg-button h-12 w-full rounded-2xl text-[15px] font-semibold', className)}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200 ease-out',
        checked ? 'tg-button' : 'bg-[rgba(127,127,127,0.25)]',
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-[3px] h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ease-out',
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}

export function StatusDot({ status, paused, size = 10 }: { status: MonitorStatus; paused?: boolean; size?: number }) {
  const color = paused ? '#87948e' : status === 'UP' ? '#18ad62' : status === 'DOWN' ? '#e04444' : '#e9a11a';
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 rounded-full', status === 'DOWN' && !paused && 'animate-pulse')}
      style={{ width: size, height: size, background: color, boxShadow: `0 0 0 3px ${color}22` }}
    />
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'ok' | 'warn' | 'crit' }) {
  const color = tone === 'ok' ? '#18ad62' : tone === 'warn' ? '#e9a11a' : tone === 'crit' ? '#e04444' : undefined;
  return (
    <div className="flex-1 px-3 py-3 text-center">
      <div className="text-[19px] font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="tg-hint mt-0.5 text-[11px] font-medium uppercase tracking-wide">{label}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="tg-hint px-6 py-10 text-center text-[15px] leading-relaxed">{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="tg-hint flex flex-col items-center justify-center gap-3 py-16 text-[14px]" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
      {label}
    </div>
  );
}

export function Banner({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) {
  const styles =
    tone === 'error'
      ? 'bg-[rgba(224,68,68,0.10)] text-[#c73030]'
      : tone === 'success'
        ? 'bg-[rgba(24,173,98,0.12)] text-[#0f7f45]'
        : 'bg-[rgba(127,127,127,0.10)]';
  return <div className={cn('mx-4 mb-4 rounded-2xl px-4 py-3 text-[14px] leading-snug', styles)}>{children}</div>;
}

/** Minimal latency sparkline; avoids pulling a chart library into the Mini App. */
export function Sparkline({ points, height = 64 }: { points: Array<number | null>; height?: number }) {
  const values = points.filter((v): v is number => v != null);
  if (values.length < 2) return null;
  const width = 320;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const step = width / (points.length - 1);
  let d = '';
  points.forEach((value, index) => {
    if (value == null) return;
    const x = index * step;
    const y = height - 6 - ((value - min) / range) * (height - 12);
    d += `${d ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke="var(--tg-link)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
