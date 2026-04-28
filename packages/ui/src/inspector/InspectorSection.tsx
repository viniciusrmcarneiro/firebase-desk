import { ChevronRight } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../cn.ts';

export interface InspectorSectionProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly defaultOpen?: boolean;
  readonly icon: ReactNode;
  readonly meta: string;
  readonly title: string;
}

export function InspectorSection(
  { children, className, defaultOpen = false, icon, meta, title }: InspectorSectionProps,
) {
  return (
    <details className={cn('border-b border-border-subtle', className)} open={defaultOpen}>
      <summary className='grid min-h-9 cursor-pointer grid-cols-[16px_16px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden'>
        <ChevronRight size={14} aria-hidden='true' className='text-text-muted' />
        <span className='text-action-primary'>{icon}</span>
        <span className='min-w-0 truncate font-semibold text-text-primary'>{title}</span>
        <code className='text-xs text-text-muted'>{meta}</code>
      </summary>
      <div className='border-t border-border-subtle'>{children}</div>
    </details>
  );
}
