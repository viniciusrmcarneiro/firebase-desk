import { density as densityTokens, type DensityName } from '@firebase-desk/design-tokens';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type ReactNode, useRef } from 'react';

export interface VirtualListProps<T> {
  readonly items: ReadonlyArray<T>;
  readonly density?: DensityName;
  readonly estimateSize?: (index: number) => number;
  readonly overscan?: number;
  readonly renderItem: (item: T, index: number) => ReactNode;
}

export function VirtualList<T>(
  { density = 'compact', estimateSize, items, overscan = 8, renderItem }: VirtualListProps<T>,
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowHeight = densityTokens[density].rowHeight;
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateSize ?? (() => rowHeight),
    overscan,
  });

  return (
    <div ref={parentRef} style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const item = items[row.index];
          if (item === undefined) return null;
          return (
            <div
              key={row.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${row.start}px)`,
              }}
            >
              {renderItem(item, row.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
