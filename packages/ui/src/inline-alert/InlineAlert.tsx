import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';
import { cn } from '../cn.ts';

const inlineAlertVariants = cva('select-text rounded-md border px-3 py-2 text-sm', {
  variants: {
    variant: {
      info: 'border-border bg-bg-subtle text-text-secondary',
      success: 'border-status-success-border bg-status-success-bg text-status-success-text',
      warning: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
      danger: 'border-status-danger-border bg-status-danger-bg text-status-danger-text',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

export interface InlineAlertProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof inlineAlertVariants>
{}

export function InlineAlert({ className, variant, ...props }: InlineAlertProps) {
  const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'status';
  return <div role={role} className={cn(inlineAlertVariants({ variant }), className)} {...props} />;
}
