'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/locale-provider';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="brand-grid rounded-3xl border border-dashed border-accent/25 bg-card px-6 py-16 text-center">
      <div className="mx-auto h-3 w-3 rounded-full bg-ok ring-8 ring-emerald-50" />
      <h2 className="mt-6 text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="brand-card rounded-2xl p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { tr } = useLocale();
  return (
    <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div role="dialog" aria-modal className="dialog-enter w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {tr('Cancel', 'Отмена')}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
