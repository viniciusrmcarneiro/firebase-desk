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
}

export function VirtualTree({ flattenedNodes, rowHeight, onToggle }: VirtualTreeProps) {
  return (
    <VirtualList
      items={flattenedNodes}
      estimateSize={() => rowHeight}
      renderItem={(node) => (
        <div
          style={{
            paddingLeft: node.depth * 12,
            height: rowHeight,
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={() => node.hasChildren && onToggle(node.id)}
        >
          {node.hasChildren ? (node.expanded ? '▾' : '▸') : ' '} {node.label}
        </div>
      )}
    />
  );
}
