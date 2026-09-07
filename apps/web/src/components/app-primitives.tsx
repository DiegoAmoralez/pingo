import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

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
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
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
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
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
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
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
  return (
    <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div role="dialog" aria-modal className="dialog-enter w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
