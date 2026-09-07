import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium text-foreground', className)} {...props} />;
}
