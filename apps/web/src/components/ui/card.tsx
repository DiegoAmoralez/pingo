import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-3xl border border-border bg-card shadow-[0_1px_2px_rgba(6,38,58,0.04),0_14px_40px_rgba(6,38,58,0.04)]', className)}
      {...props}
    />
  );
}
