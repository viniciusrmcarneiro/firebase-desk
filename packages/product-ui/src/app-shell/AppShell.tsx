import { cn } from '@firebase-desk/ui';
import { type ReactNode } from 'react';

export interface AppShellProps {
  readonly className?: string;
  readonly sidebar: ReactNode;
  readonly statusBar?: ReactNode;
  readonly titlebar?: ReactNode;
  readonly workspace: ReactNode;
}

export function AppShell({ className, sidebar, statusBar, titlebar, workspace }: AppShellProps) {
  return (
    <div
      className={cn(
        'grid h-full grid-rows-[auto_minmax(0,1fr)_auto] bg-bg-app text-text-primary',
        className,
      )}
    >
      {titlebar
        ? <div className='border-b border-border-subtle bg-bg-panel'>{titlebar}</div>
        : null}
      <div className='grid min-h-0 grid-cols-[var(--sidebar-width,280px)_minmax(0,1fr)]'>
        {sidebar}
        {workspace}
      </div>
      {statusBar}
    </div>
  );
}
