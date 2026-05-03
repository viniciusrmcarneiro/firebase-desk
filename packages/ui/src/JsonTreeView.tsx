import { useMemo } from 'react';
import { VirtualTree, type VirtualTreeNode } from './VirtualTree.tsx';

export interface JsonTreeViewProps {
  readonly value: unknown;
  readonly rowHeight?: number;
  readonly expandedPaths: ReadonlySet<string>;
  readonly onTogglePath: (path: string) => void;
}

interface FlatNode extends VirtualTreeNode {
  readonly path: string;
}

export function JsonTreeView(
  { value, rowHeight = 22, expandedPaths, onTogglePath }: JsonTreeViewProps,
) {
  const flattened = useMemo(() => flatten(value, '$', 0, expandedPaths), [value, expandedPaths]);
  return (
    <div className='h-full select-text'>
      <VirtualTree
        flattenedNodes={flattened}
        rowHeight={rowHeight}
        onToggle={(id) => onTogglePath(id)}
      />
    </div>
  );
}

function flatten(
  value: unknown,
  path: string,
  depth: number,
  expanded: ReadonlySet<string>,
): FlatNode[] {
  if (Array.isArray(value)) {
    const node: FlatNode = {
      id: path,
      path,
      depth,
      hasChildren: value.length > 0,
      expanded: expanded.has(path),
      label: `[${value.length}]`,
    };
    if (!node.expanded) return [node];
    const children = value.flatMap((entry, i) =>
      flatten(entry, `${path}.${i}`, depth + 1, expanded)
    );
    return [node, ...children];
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const node: FlatNode = {
      id: path,
      path,
      depth,
      hasChildren: entries.length > 0,
      expanded: expanded.has(path),
      label: `{${entries.length}}`,
    };
    if (!node.expanded) return [node];
    const children = entries.flatMap(([k, v]) => flatten(v, `${path}.${k}`, depth + 1, expanded));
    return [node, ...children];
  }
  return [
    {
      id: path,
      path,
      depth,
      hasChildren: false,
      expanded: false,
      label: `${path}: ${JSON.stringify(value)}`,
    },
  ];
}
