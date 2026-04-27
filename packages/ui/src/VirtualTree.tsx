import { density as densityTokens, type DensityName } from '@firebase-desk/design-tokens';
import { type KeyboardEvent, type ReactNode, useCallback, useState } from 'react';
import { VirtualList } from './VirtualList.tsx';

export interface VirtualTreeNode {
  readonly id: string;
  readonly label: string;
  readonly depth: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
}

export interface VirtualTreeProps {
  readonly flattenedNodes: ReadonlyArray<VirtualTreeNode>;
  readonly density?: DensityName;
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
  const resolvedRowHeight = rowHeight ?? densityTokens[density].treeRowHeight;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, index: number, node: VirtualTreeNode) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(Math.min(index + 1, flattenedNodes.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(Math.max(index - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (!node.hasChildren && !onSelect) return;
        e.preventDefault();
        onSelect?.(node.id);
        if (node.hasChildren) onToggle(node.id);
      }
    },
    [flattenedNodes.length, onSelect, onToggle],
  );

  return (
    <div role='tree' aria-label={ariaLabel} style={{ height: '100%' }}>
      <VirtualList
        density={density}
        items={flattenedNodes}
        estimateSize={() => resolvedRowHeight}
        renderItem={(node, index) => (
          <div
            role='treeitem'
            aria-expanded={node.hasChildren ? node.expanded : undefined}
            aria-level={node.depth + 1}
            tabIndex={index === focusedIndex ? 0 : -1}
            ref={(el) => {
              if (el && index === focusedIndex && el.ownerDocument.activeElement !== el) {
                // focus only when the tree itself already owns focus
                if (el.parentElement?.contains(el.ownerDocument.activeElement)) {
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
            }}
            onClick={() => {
              setFocusedIndex(index);
              onSelect?.(node.id);
              if (node.hasChildren) onToggle(node.id);
            }}
            onDoubleClick={() => onOpen?.(node.id)}
            onKeyDown={(e) => handleKeyDown(e, index, node)}
          >
            {renderNode
              ? renderNode(node)
              : `${node.hasChildren ? (node.expanded ? '▾' : '▸') : ' '} ${node.label}`}
          </div>
        )}
      />
    </div>
  );
}
