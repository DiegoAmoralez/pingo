import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(23,20,18,0.04)]', className)}
      {...props}
    />
  );
}
