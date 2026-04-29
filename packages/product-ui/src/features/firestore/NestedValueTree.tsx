import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { ChevronRight, FileText, Folder } from 'lucide-react';
import type { ReactNode } from 'react';
import { FieldContextMenu } from './FieldContextMenu.tsx';
import { type FieldEditTarget, fieldPathFromTreeKey } from './fieldEditModel.ts';
import {
  firestoreValueType,
  formatFirestoreValue,
  isFirestoreTypedValue,
} from './FirestoreValueCell.tsx';

export interface NestedValueTreeProps {
  readonly document?: FirestoreDocumentResult | undefined;
  readonly onDeleteField?: ((target: FieldEditTarget) => void) | undefined;
  readonly onEditField?: ((target: FieldEditTarget, jsonMode: boolean) => void) | undefined;
  readonly onSetFieldValue?: ((target: FieldEditTarget, value: unknown) => void) | undefined;
  readonly onSetFieldNull?: ((target: FieldEditTarget) => void) | undefined;
  readonly value: Record<string, unknown>;
}

export function NestedValueTree(
  {
    document,
    onDeleteField,
    onEditField,
    onSetFieldNull,
    onSetFieldValue,
    value,
  }: NestedValueTreeProps,
) {
  const actionProps = { document, onDeleteField, onEditField, onSetFieldNull, onSetFieldValue };
  return (
    <div className='max-h-[48vh] overflow-auto rounded-md border border-border-subtle font-mono text-xs'>
      {Object.entries(value).map(([key, entry]) =>
        renderValueTreeNode(key, entry, 0, [], actionProps)
      )}
    </div>
  );
}

interface TreeActionProps {
  readonly document?: FirestoreDocumentResult | undefined;
  readonly onDeleteField?: ((target: FieldEditTarget) => void) | undefined;
  readonly onEditField?: ((target: FieldEditTarget, jsonMode: boolean) => void) | undefined;
  readonly onSetFieldValue?: ((target: FieldEditTarget, value: unknown) => void) | undefined;
  readonly onSetFieldNull?: ((target: FieldEditTarget) => void) | undefined;
}

function renderValueTreeNode(
  key: string,
  value: unknown,
  level: number,
  parentPath: ReadonlyArray<string>,
  actionProps: TreeActionProps,
): ReactNode {
  const fieldPath = fieldPathFromTreeKey(key, parentPath);
  if (isExpandableValue(value)) {
    const entries = Array.isArray(value)
      ? value.map((entry, index) => [`[${index}]`, entry] as const)
      : Object.entries(value as Record<string, unknown>);
    const branch = (
      <TreeBranch
        key={key}
        defaultOpen={level < 2}
        icon={<Folder size={14} aria-hidden='true' />}
        label={key}
        level={level}
        meta={valueType(value)}
      >
        {entries.map(([childKey, childValue]) =>
          renderValueTreeNode(childKey, childValue, level + 1, fieldPath ?? parentPath, actionProps)
        )}
      </TreeBranch>
    );
    return withFieldContext(key, branch, value, fieldPath, actionProps);
  }
  const leaf = (
    <TreeLeaf
      action={fieldPath ? quickFieldAction(value, fieldPath, actionProps) : undefined}
      key={key}
      label={key}
      level={level}
      meta={valueType(value)}
      value={formatValue(value)}
    />
  );
  return withFieldContext(key, leaf, value, fieldPath, actionProps);
}

function quickFieldAction(
  value: unknown,
  fieldPath: ReadonlyArray<string>,
  { document, onSetFieldValue }: TreeActionProps,
): ReactNode {
  if (!document || !onSetFieldValue || typeof value !== 'boolean') return null;
  const target: FieldEditTarget = { documentPath: document.path, fieldPath, value };
  return (
    <input
      aria-label={`Toggle ${fieldPath.join('.')}`}
      checked={value}
      type='checkbox'
      onChange={(event) => onSetFieldValue(target, event.currentTarget.checked)}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

function withFieldContext(
  key: string,
  node: ReactNode,
  value: unknown,
  fieldPath: ReadonlyArray<string> | null,
  { document, onDeleteField, onEditField, onSetFieldNull }: TreeActionProps,
): ReactNode {
  if (!document || !fieldPath) return node;
  return (
    <FieldContextMenu
      key={key}
      document={document}
      fieldPath={fieldPath}
      value={value}
      onDeleteField={onDeleteField}
      onEditField={onEditField}
      onSetFieldNull={onSetFieldNull}
    >
      {node}
    </FieldContextMenu>
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
