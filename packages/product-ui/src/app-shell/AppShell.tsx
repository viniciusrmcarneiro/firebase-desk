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
        'flex h-full flex-col bg-bg-app text-text-primary',
        className,
      )}
    >
      {titlebar
        ? <div className='shrink-0 border-b border-border-subtle bg-bg-panel'>{titlebar}</div>
        : null}
      <div className='grid min-h-0 flex-1 grid-cols-[var(--sidebar-width,280px)_minmax(0,1fr)]'>
        {sidebar}
        <div className='grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]'>
          {workspace}
          {statusBar}
        </div>
      </div>
    </div>
  );
}
