import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-fg shadow-sm hover:-translate-y-0.5 hover:bg-[#00765f] hover:shadow-md',
        secondary: 'bg-white text-foreground border border-border hover:-translate-y-0.5 hover:border-accent/30 hover:bg-soft-lime/40',
        ghost: 'hover:bg-soft-lime hover:text-accent',
        danger: 'bg-crit text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3.5 text-xs',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
