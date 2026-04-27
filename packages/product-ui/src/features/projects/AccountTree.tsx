import type { ProjectTarget } from '@firebase-desk/repo-contracts';
import { Badge, cn, IconButton, Input, VirtualTree, type VirtualTreeNode } from '@firebase-desk/ui';
import {
  AlertCircle,
  ChevronRight,
  Code2,
  Database,
  Folder,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { type ReactNode } from 'react';

export type AccountTreeItemKind =
  | 'auth'
  | 'collection'
  | 'firestore'
  | 'project'
  | 'script'
  | 'status';
export type AccountTreeItemStatus = 'idle' | 'loading' | 'error';

export interface AccountTreeItem extends VirtualTreeNode {
  readonly kind: AccountTreeItemKind;
  readonly projectTarget?: ProjectTarget;
  readonly secondary?: string;
  readonly selected?: boolean;
  readonly status?: AccountTreeItemStatus;
  readonly canRefresh?: boolean;
  readonly canRemove?: boolean;
}

export interface AccountTreeProps {
  readonly filterValue: string;
  readonly items: ReadonlyArray<AccountTreeItem>;
  readonly onAddProject: () => void;
  readonly onFilterChange: (value: string) => void;
  readonly onOpenItem: (id: string) => void;
  readonly onRefreshItem: (id: string) => void;
  readonly onRemoveItem: (id: string) => void;
  readonly onSelectItem: (id: string) => void;
  readonly onToggleItem: (id: string) => void;
}

export function AccountTree(
  {
    filterValue,
    items,
    onAddProject,
    onFilterChange,
    onOpenItem,
    onRefreshItem,
    onRemoveItem,
    onSelectItem,
    onToggleItem,
  }: AccountTreeProps,
) {
  return (
    <div className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2'>
      <div className='grid gap-2'>
        <div className='flex items-center gap-1'>
          <Input
            aria-label='Filter account tree'
            placeholder='Filter tree'
            value={filterValue}
            onChange={(event) => onFilterChange(event.currentTarget.value)}
          />
          <IconButton
            icon={<Plus size={15} aria-hidden='true' />}
            label='Add project'
            variant='primary'
            onClick={onAddProject}
          />
        </div>
      </div>
      <div className='min-h-0'>
        <VirtualTree
          ariaLabel='Account tree'
          flattenedNodes={items}
          rowHeight={30}
          renderNode={(node) => (
            <AccountTreeRow
              item={node as AccountTreeItem}
              onRefreshItem={onRefreshItem}
              onRemoveItem={onRemoveItem}
            />
          )}
          onOpen={onOpenItem}
          onSelect={onSelectItem}
          onToggle={onToggleItem}
        />
      </div>
    </div>
  );
}

interface AccountTreeRowProps {
  readonly item: AccountTreeItem;
  readonly onRefreshItem: (id: string) => void;
  readonly onRemoveItem: (id: string) => void;
}

function AccountTreeRow({ item, onRefreshItem, onRemoveItem }: AccountTreeRowProps) {
  const icon = iconForKind(item.kind);
  return (
    <div
      className={cn(
        'group/tree-row relative flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-text-primary transition-colors hover:bg-action-ghost-hover',
        item.selected
          && 'bg-action-selected text-action-primary shadow-[inset_0_0_0_1px_var(--color-action-primary)]',
        item.status && 'text-text-muted',
      )}
    >
      <span className='grid size-4 shrink-0 place-items-center text-text-muted'>
        {item.hasChildren
          ? (
            <ChevronRight
              className={cn('transition-transform', item.expanded && 'rotate-90')}
              size={14}
              aria-hidden='true'
            />
          )
          : null}
      </span>
      <span className='grid size-4 shrink-0 place-items-center text-action-primary'>{icon}</span>
      <span className='min-w-0 flex-1 truncate'>{item.label}</span>
      {item.status === 'loading' ? <span className='text-xs text-text-muted'>Loading</span> : null}
      {item.status === 'error'
        ? <AlertCircle className='text-status-danger-text' size={14} aria-label='Load failed' />
        : null}
      {item.secondary
        ? (
          <span className='max-w-24 truncate rounded-full bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-text-muted'>
            {item.secondary}
          </span>
        )
        : null}
      {item.projectTarget
        ? <Badge variant={item.projectTarget}>{item.projectTarget}</Badge>
        : null}
      {item.canRefresh
        ? (
          <IconButton
            icon={<RefreshCw size={13} aria-hidden='true' />}
            label={`Refresh ${item.label}`}
            size='xs'
            variant='ghost'
            className='opacity-0 transition-opacity group-hover/tree-row:opacity-100'
            onClick={(event) => {
              event.stopPropagation();
              onRefreshItem(item.id);
            }}
          />
        )
        : null}
      {item.canRemove
        ? (
          <IconButton
            icon={<Trash2 size={13} aria-hidden='true' />}
            label={`Remove ${item.label}`}
            size='xs'
            variant='ghost'
            className='opacity-0 transition-opacity group-hover/tree-row:opacity-100'
            onClick={(event) => {
              event.stopPropagation();
              onRemoveItem(item.id);
            }}
          />
        )
        : null}
    </div>
  );
}

function iconForKind(kind: AccountTreeItemKind): ReactNode {
  if (kind === 'project') return <Database size={15} aria-hidden='true' />;
  if (kind === 'firestore') return <Folder size={15} aria-hidden='true' />;
  if (kind === 'auth') return <Users size={15} aria-hidden='true' />;
  if (kind === 'script') return <Code2 size={15} aria-hidden='true' />;
  if (kind === 'collection') return <Folder size={15} aria-hidden='true' />;
  return <AlertCircle size={15} aria-hidden='true' />;
}
