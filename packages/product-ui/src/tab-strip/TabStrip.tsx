import { cn } from '@firebase-desk/ui';
import { type ReactNode } from 'react';

export interface ProductTab {
  readonly id: string;
  readonly label: ReactNode;
}

export interface TabStripProps {
  readonly activeTabId: string;
  readonly className?: string;
  readonly onSelectTab?: (id: string) => void;
  readonly tabs: ReadonlyArray<ProductTab>;
}

export function TabStrip({ activeTabId, className, onSelectTab, tabs }: TabStripProps) {
  return (
    <div
      className={cn(
        'flex h-[var(--density-compact-tab-height)] items-end border-b border-border-subtle bg-bg-panel',
        className,
      )}
      role='tablist'
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn(
            'h-full border-b-2 border-transparent px-3 text-sm text-text-secondary',
            tab.id === activeTabId && 'border-action-primary bg-action-selected text-text-primary',
          )}
          data-state={tab.id === activeTabId ? 'active' : 'inactive'}
          role='tab'
          type='button'
          onClick={() => onSelectTab?.(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
