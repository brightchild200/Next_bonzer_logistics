import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'border border-border bg-transparent',
        success: 'border-transparent bg-success text-success-foreground hover:bg-success/80',
        warning: 'border-transparent bg-warning text-warning-foreground hover:bg-warning/80',
        info: 'border-transparent bg-info text-info-foreground hover:bg-info/80',
        subtle: 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[11px]',
        lg: 'px-3 py-1 text-sm',
      },
      tone: {
        solid: '',
        soft: 'bg-opacity-10 text-foreground border border-current/20',
        outline: 'bg-transparent border border-current',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      tone: 'solid',
    },
    compoundVariants: [
      {
        variant: 'success',
        tone: 'soft',
        className: 'bg-success/10 text-success border-success/20',
      },
      {
        variant: 'warning',
        tone: 'soft',
        className: 'bg-warning/10 text-warning border-warning/20',
      },
      {
        variant: 'destructive',
        tone: 'soft',
        className: 'bg-destructive/10 text-destructive border-destructive/20',
      },
      {
        variant: 'info',
        tone: 'soft',
        className: 'bg-info/10 text-info border-info/20',
      },
      {
        variant: 'default',
        tone: 'soft',
        className: 'bg-primary/10 text-primary border-primary/20',
      },
      {
        variant: 'secondary',
        tone: 'soft',
        className: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
      },
    ],
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, tone, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size, tone }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
