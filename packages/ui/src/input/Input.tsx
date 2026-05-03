import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../cn.ts';

const inputVariants = cva(
  'w-full rounded-md border border-border bg-bg-panel px-2 text-text-primary outline-none transition-colors duration-fast ease-standard placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-border-danger',
  {
    variants: {
      density: {
        compact: 'h-[var(--density-compact-control-height)] text-sm',
        comfortable: 'h-[var(--density-comfortable-control-height)] text-sm',
      },
    },
    defaultVariants: {
      density: 'compact',
    },
  },
);

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants>
{
  readonly invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, density, invalid = false, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputVariants({ density }), className)}
      data-invalid={invalid}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
