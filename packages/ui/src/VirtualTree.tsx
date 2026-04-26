import { useCallback, useState } from 'react';
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
  readonly rowHeight: number;
  readonly onToggle: (id: string) => void;
  readonly ariaLabel?: string;
}

export function VirtualTree(
  { flattenedNodes, rowHeight, onToggle, ariaLabel }: VirtualTreeProps,
) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, index: number, node: VirtualTreeNode) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(Math.min(index + 1, flattenedNodes.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(Math.max(index - 1, 0));
      } else if ((e.key === 'Enter' || e.key === ' ') && node.hasChildren) {
        e.preventDefault();
        onToggle(node.id);
      }
    },
    [flattenedNodes.length, onToggle],
  );

  return (
    <div role='tree' aria-label={ariaLabel} style={{ height: '100%' }}>
      <VirtualList
        items={flattenedNodes}
        estimateSize={() => rowHeight}
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
              height: rowHeight,
              display: 'flex',
              alignItems: 'center',
              cursor: node.hasChildren ? 'pointer' : 'default',
            }}
            onClick={() => {
              setFocusedIndex(index);
              if (node.hasChildren) onToggle(node.id);
            }}
            onKeyDown={(e) => handleKeyDown(e, index, node)}
          >
            {node.hasChildren ? (node.expanded ? '▾' : '▸') : ' '} {node.label}
          </div>
        )}
      />
    </div>
  );
}
