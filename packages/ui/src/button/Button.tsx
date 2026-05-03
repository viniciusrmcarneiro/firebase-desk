import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../cn.ts';

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center rounded-md border font-medium transition-colors duration-fast ease-standard disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'border-action-primary bg-action-primary text-text-inverse hover:bg-action-primary-hover active:bg-action-primary-active',
        secondary:
          'border-border bg-action-secondary text-text-primary hover:bg-action-secondary-hover',
        ghost: 'border-transparent bg-transparent text-text-primary hover:bg-action-ghost-hover',
        danger:
          'border-status-danger-border bg-status-danger-bg text-status-danger-text hover:bg-action-secondary-hover',
        warning:
          'border-status-warning-border bg-status-warning-bg text-status-warning-text hover:bg-action-secondary-hover',
      },
      size: {
        xs: 'h-[var(--density-compact-control-height)] px-2 text-xs',
        sm: 'h-[var(--density-control-height)] px-2.5 text-sm',
        md: 'h-[var(--density-comfortable-control-height)] px-3 text-sm',
      },
      density: {
        compact: 'gap-1.5',
        comfortable: 'gap-2',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'sm',
      density: 'compact',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants>
{
  readonly asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, density, size, type = 'button', variant, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';
    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ density, size, variant }), className)}
        type={asChild ? undefined : type}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
