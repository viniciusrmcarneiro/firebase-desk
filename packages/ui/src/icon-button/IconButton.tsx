import { cva, type VariantProps } from 'class-variance-authority';
import { type ReactNode } from 'react';
import { Button, type ButtonProps } from '../button/Button.tsx';
import { cn } from '../cn.ts';

const iconButtonVariants = cva('p-0', {
  variants: {
    size: {
      xs: 'h-[var(--density-compact-control-height)] w-[var(--density-compact-control-height)]',
      sm: 'h-[var(--density-control-height)] w-[var(--density-control-height)]',
      md:
        'h-[var(--density-comfortable-control-height)] w-[var(--density-comfortable-control-height)]',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

export interface IconButtonProps
  extends Omit<ButtonProps, 'children' | 'size'>, VariantProps<typeof iconButtonVariants>
{
  readonly icon: ReactNode;
  readonly label: string;
}

export function IconButton({ className, icon, label, size, ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      className={cn(iconButtonVariants({ size }), className)}
      title={label}
      {...props}
    >
      {icon}
    </Button>
  );
}
