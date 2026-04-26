import { cn } from '@firebase-desk/ui';
import { type ReactNode } from 'react';

export interface WorkspaceShellProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly tabStrip?: ReactNode;
  readonly toolbar?: ReactNode;
}

export function WorkspaceShell({ children, className, tabStrip, toolbar }: WorkspaceShellProps) {
  return (
    <main className={cn('grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] bg-bg-app', className)}>
      {tabStrip ?? <div />}
      {toolbar ?? <div />}
      <div className='min-h-0 overflow-hidden'>{children}</div>
    </main>
  );
}
