import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-xl border border-border bg-white px-4 text-sm text-foreground shadow-[0_1px_2px_rgba(6,38,58,0.03)] outline-none placeholder:text-muted/70 focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/20',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('mb-1.5 block text-sm font-semibold text-foreground', className)} {...props} />;
}
