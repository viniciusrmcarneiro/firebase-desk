import { type HTMLAttributes } from 'react';
import { cn } from '../cn.ts';

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {}

export function Toolbar({ className, ...props }: ToolbarProps) {
  return (
    <div
      role='toolbar'
      className={cn(
        'flex h-[var(--density-toolbar-height)] items-center gap-1 border-b border-border-subtle bg-bg-panel px-2',
        className,
      )}
      {...props}
    />
  );
}
