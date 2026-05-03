import { cn } from '@firebase-desk/ui';
import { type ReactNode } from 'react';

export interface SidebarShellProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly footer?: ReactNode;
  readonly title: ReactNode;
}

export function SidebarShell({ children, className, footer, title }: SidebarShellProps) {
  return (
    <aside
      className={cn(
        'grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] border-r border-border-subtle bg-bg-panel',
        className,
      )}
    >
      <div className='flex h-[var(--density-toolbar-height)] items-center border-b border-border-subtle px-2 text-sm font-semibold'>
        {title}
      </div>
      <div className='min-h-0 overflow-auto p-2'>{children}</div>
      {footer ? <div className='border-t border-border-subtle p-2'>{footer}</div> : null}
    </aside>
  );
}
