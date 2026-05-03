import { density as densityTokens, type DensityName } from '@firebase-desk/design-tokens';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { visibleVirtualRows } from './virtualRows.ts';

export interface VirtualTreeNode {
  readonly id: string;
  readonly label: string;
  readonly depth: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
}

export interface VirtualTreeProps {
  readonly flattenedNodes: ReadonlyArray<VirtualTreeNode>;
  readonly density?: DensityName | undefined;
  readonly rowHeight?: number;
  readonly onToggle: (id: string) => void;
  readonly onOpen?: (id: string) => void;
  readonly onSelect?: (id: string) => void;
  readonly renderNode?: (node: VirtualTreeNode) => ReactNode;
  readonly ariaLabel?: string;
}

export function VirtualTree(
  {
    ariaLabel,
    density = 'compact',
    flattenedNodes,
    onOpen,
    onSelect,
    onToggle,
    renderNode,
    rowHeight,
  }: VirtualTreeProps,
) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldFocusRef = useRef(false);
  const resolvedRowHeight = rowHeight ?? densityTokens[density].treeRowHeight;
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => resolvedRowHeight,
    initialRect: {
      height: resolvedRowHeight * Math.min(Math.max(flattenedNodes.length, 1), 12),
      width: 0,
    },
    overscan: 8,
  });
  const virtualRows = visibleVirtualRows(
    virtualizer.getVirtualItems(),
    flattenedNodes.length,
    resolvedRowHeight,
  );

  useEffect(() => {
    setFocusedIndex((current) => clampIndex(current, flattenedNodes.length));
  }, [flattenedNodes.length]);

  const moveFocus = useCallback(
    (index: number) => {
      const next = clampIndex(index, flattenedNodes.length);
      shouldFocusRef.current = true;
      setFocusedIndex(next);
      virtualizer.scrollToIndex(next, { align: 'auto' });
    },
    [flattenedNodes.length, virtualizer],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, index: number, node: VirtualTreeNode) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus(index + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(index - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        moveFocus(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        moveFocus(flattenedNodes.length - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (!node.hasChildren && !onSelect) return;
        e.preventDefault();
        onSelect?.(node.id);
        if (node.hasChildren) onToggle(node.id);
      }
    },
    [flattenedNodes.length, moveFocus, onSelect, onToggle],
  );

  return (
    <div ref={parentRef} className='h-full overflow-auto' role='tree' aria-label={ariaLabel}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualRows.map((row) => {
          const node = flattenedNodes[row.index];
          if (!node) return null;
          return (
            <div
              key={row.key}
              role='treeitem'
              aria-expanded={node.hasChildren ? node.expanded : undefined}
              aria-level={node.depth + 1}
              tabIndex={row.index === focusedIndex ? 0 : -1}
              ref={(el) => {
                if (el && row.index === focusedIndex && el.ownerDocument.activeElement !== el) {
                  if (
                    shouldFocusRef.current
                    || parentRef.current?.contains(el.ownerDocument.activeElement)
                  ) {
                    shouldFocusRef.current = false;
                    el.focus();
                  }
                }
              }}
              style={{
                paddingLeft: node.depth * 12,
                height: resolvedRowHeight,
                display: 'flex',
                alignItems: 'center',
                cursor: node.hasChildren || onSelect ? 'pointer' : 'default',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${row.start}px)`,
              }}
              onClick={() => {
                setFocusedIndex(row.index);
                onSelect?.(node.id);
                if (node.hasChildren) onToggle(node.id);
              }}
              onDoubleClick={() => onOpen?.(node.id)}
              onKeyDown={(e) => handleKeyDown(e, row.index, node)}
            >
              {renderNode
                ? renderNode(node)
                : `${node.hasChildren ? (node.expanded ? '▾' : '▸') : ' '} ${node.label}`}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(index, count - 1));
}
