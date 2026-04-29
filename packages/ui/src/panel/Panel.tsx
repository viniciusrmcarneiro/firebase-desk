import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../cn.ts';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {}

export function Panel({ className, ...props }: PanelProps) {
  return (
    <section
      className={cn('min-h-0 overflow-hidden border border-border-subtle bg-bg-panel', className)}
      {...props}
    />
  );
}

export interface PanelHeaderProps extends HTMLAttributes<HTMLDivElement> {
  readonly actions?: ReactNode;
}

export function PanelHeader({ actions, children, className, ...props }: PanelHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-[var(--density-compact-toolbar-height)] items-center justify-between gap-2 border-b border-border-subtle px-2',
        className,
      )}
      {...props}
    >
      <div className='min-w-0 truncate text-sm font-semibold text-text-primary'>{children}</div>
      {actions ? <div className='flex shrink-0 items-center gap-1'>{actions}</div> : null}
    </header>
  );
}

export function PanelBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('min-h-0 overflow-auto p-[var(--density-compact-panel-padding)]', className)}
      {...props}
    />
  );
}

export interface DockedPanelProps extends HTMLAttributes<HTMLElement> {
  readonly edge?: 'bottom' | 'left' | 'right' | 'top';
}

const dockedPanelEdgeClasses: Record<NonNullable<DockedPanelProps['edge']>, string> = {
  bottom: 'border-b border-border-strong',
  left: 'border-l border-border-strong',
  right: 'border-r border-border-strong',
  top: 'border-t border-border-strong',
};

export function DockedPanel({ className, edge = 'top', ...props }: DockedPanelProps) {
  return (
    <section
      className={cn(
        'min-h-0 overflow-hidden bg-bg-panel',
        dockedPanelEdgeClasses[edge],
        className,
      )}
      {...props}
    />
  );
}
