import { ChevronRight, FileText, Folder } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  firestoreValueType,
  formatFirestoreValue,
  isFirestoreTypedValue,
} from './FirestoreValueCell.tsx';

export function NestedValueTree({ value }: { readonly value: Record<string, unknown>; }) {
  return (
    <div className='max-h-[48vh] overflow-auto rounded-md border border-border-subtle font-mono text-xs'>
      {Object.entries(value).map(([key, entry]) => renderValueTreeNode(key, entry, 0))}
    </div>
  );
}

function renderValueTreeNode(key: string, value: unknown, level: number): ReactNode {
  if (isExpandableValue(value)) {
    const entries = Array.isArray(value)
      ? value.map((entry, index) => [`[${index}]`, entry] as const)
      : Object.entries(value as Record<string, unknown>);
    return (
      <TreeBranch
        key={key}
        defaultOpen={level < 2}
        icon={<Folder size={14} aria-hidden='true' />}
        label={key}
        level={level}
        meta={valueType(value)}
      >
        {entries.map(([childKey, childValue]) =>
          renderValueTreeNode(childKey, childValue, level + 1)
        )}
      </TreeBranch>
    );
  }
  return (
    <TreeLeaf
      key={key}
      label={key}
      level={level}
      meta={valueType(value)}
      value={formatValue(value)}
    />
  );
}

interface TreeBranchProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly icon: ReactNode;
  readonly label: string;
  readonly level: number;
  readonly meta: string;
}

function TreeBranch(
  { action, children, defaultOpen = false, icon, label, level, meta }: TreeBranchProps,
) {
  return (
    <details className='block' open={defaultOpen} role='treeitem'>
      <summary
        className='grid min-h-8 cursor-pointer list-none grid-cols-[16px_16px_minmax(140px,0.8fr)_minmax(160px,1fr)_112px_auto] items-center gap-2 border-b border-border-subtle pr-3 text-text-primary transition-colors hover:bg-action-ghost-hover [&::-webkit-details-marker]:hidden'
        style={{ paddingLeft: 12 + level * 22 }}
      >
        <ChevronRight size={13} aria-hidden='true' className='text-text-muted' />
        <span className='text-action-primary'>{icon}</span>
        <span className='min-w-0 truncate font-medium'>{label}</span>
        <span />
        <code className='text-text-muted'>{meta}</code>
        <span>{action}</span>
      </summary>
      <div role='group'>{children}</div>
    </details>
  );
}

interface TreeLeafProps {
  readonly action?: ReactNode;
  readonly label: string;
  readonly level: number;
  readonly meta: string;
  readonly value: string;
}

function TreeLeaf({ action, label, level, meta, value }: TreeLeafProps) {
  return (
    <div
      className='grid min-h-8 grid-cols-[16px_16px_minmax(140px,0.8fr)_minmax(160px,1fr)_112px_auto] items-center gap-2 border-b border-border-subtle pr-3 text-text-primary transition-colors hover:bg-action-ghost-hover'
      role='treeitem'
      style={{ paddingLeft: 12 + level * 22 }}
    >
      <span />
      <FileText size={13} aria-hidden='true' className='text-text-muted' />
      <span className='min-w-0 truncate font-medium'>{label}</span>
      <span className='min-w-0 truncate text-text-muted'>{value}</span>
      <code className='text-text-muted'>{meta}</code>
      <span>{action}</span>
    </div>
  );
}

function isExpandableValue(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !isFirestoreTypedValue(value);
}

function valueType(value: unknown): string {
  return firestoreValueType(value);
}

function formatValue(value: unknown): string {
  return formatFirestoreValue(value);
}
