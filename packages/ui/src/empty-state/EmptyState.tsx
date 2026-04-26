import { type ReactNode } from 'react';
import { cn } from '../cn.ts';

export interface EmptyStateProps {
  readonly action?: ReactNode;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly title: ReactNode;
}

export function EmptyState({ action, className, description, icon, title }: EmptyStateProps) {
  return (
    <div className={cn('grid justify-items-center gap-2 p-6 text-center', className)}>
      {icon ? <div className='text-text-muted'>{icon}</div> : null}
      <div className='text-sm font-semibold text-text-primary'>{title}</div>
      {description
        ? <div className='max-w-sm text-sm text-text-secondary'>{description}</div>
        : null}
      {action ? <div className='pt-1'>{action}</div> : null}
    </div>
  );
}
