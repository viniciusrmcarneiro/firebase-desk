import { cn } from '@firebase-desk/ui';
import { type ReactNode } from 'react';

export interface StatusBarProps {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly left?: ReactNode;
  readonly right?: ReactNode;
}

export function StatusBar({ children, className, left, right }: StatusBarProps) {
  return (
    <footer
      className={cn(
        'z-statusBar flex h-7 items-center justify-between gap-2 border-t border-border-subtle bg-bg-panel px-2 text-xs text-text-secondary',
        className,
      )}
    >
      <div className='flex min-w-0 items-center gap-2'>{left ?? children}</div>
      {right ? <div className='flex shrink-0 items-center gap-2'>{right}</div> : null}
    </footer>
  );
}
