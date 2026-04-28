import { ChevronRight } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../cn.ts';
import { ContextMenu, ContextMenuTrigger } from '../context-menu/index.ts';
import { VirtualList } from '../VirtualList.tsx';

export interface ExplorerTreeRowModel {
  readonly id: string;
  readonly icon?: ReactNode;
  readonly label: ReactNode;
  readonly level: number;
  readonly meta?: ReactNode;
  readonly value?: ReactNode;
  readonly expanded?: boolean;
  readonly hasChildren?: boolean;
}

export interface ExplorerTreeProps<TNode extends ExplorerTreeRowModel = ExplorerTreeRowModel> {
  readonly className?: string;
  readonly contextMenu?: ((node: TNode) => ReactNode | null) | undefined;
  readonly estimateSize?: (index: number) => number;
  readonly onOpen?: ((id: string) => void) | undefined;
  readonly onToggle: (id: string) => void;
  readonly renderAction?: ((node: TNode) => ReactNode) | undefined;
  readonly rows: ReadonlyArray<TNode>;
}

export function ExplorerTree<TNode extends ExplorerTreeRowModel = ExplorerTreeRowModel>(
  { className, contextMenu, estimateSize = () => 32, onOpen, onToggle, renderAction, rows }:
    ExplorerTreeProps<TNode>,
) {
  return (
    <div className={cn('h-full min-w-[680px] font-mono text-xs', className)} role='tree'>
      <VirtualList
        estimateSize={estimateSize}
        getItemKey={(item) => item.id}
        items={rows}
        renderItem={(item) => (
          <ExplorerTreeRow
            contextMenu={contextMenu}
            node={item}
            renderAction={renderAction}
            onOpen={onOpen}
            onToggle={onToggle}
          />
        )}
      />
    </div>
  );
}

function ExplorerTreeRow<TNode extends ExplorerTreeRowModel>(
  { contextMenu, node, renderAction, onOpen, onToggle }: {
    readonly contextMenu?: ((node: TNode) => ReactNode | null) | undefined;
    readonly node: TNode;
    readonly renderAction?: ((node: TNode) => ReactNode) | undefined;
    readonly onOpen?: ((id: string) => void) | undefined;
    readonly onToggle: (id: string) => void;
  },
) {
  const row = (
    <div
      className='grid min-h-8 grid-cols-[16px_16px_minmax(140px,0.8fr)_minmax(160px,1fr)_112px_auto] items-center gap-2 border-b border-border-subtle pr-3 text-text-primary transition-colors hover:bg-action-ghost-hover'
      role='treeitem'
      style={{ paddingLeft: 12 + node.level * 22 }}
      aria-expanded={node.hasChildren ? Boolean(node.expanded) : undefined}
      onClick={() => {
        if (node.hasChildren) onToggle(node.id);
      }}
      onDoubleClick={() => onOpen?.(node.id)}
    >
      <span>
        {node.hasChildren
          ? (
            <ChevronRight
              size={13}
              aria-hidden='true'
              className={cn('text-text-muted transition-transform', node.expanded && 'rotate-90')}
            />
          )
          : null}
      </span>
      <span className='text-action-primary'>{node.icon}</span>
      <span className='min-w-0 truncate font-medium'>{node.label}</span>
      <span className='min-w-0 truncate text-text-muted'>{node.value ?? ''}</span>
      <code className='text-text-muted'>{node.meta ?? ''}</code>
      <span>{renderAction?.(node)}</span>
    </div>
  );
  const content = contextMenu?.(node);
  if (!content) return row;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      {content}
    </ContextMenu>
  );
}
