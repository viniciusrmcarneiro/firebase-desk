import { density as densityTokens, type DensityName } from '@firebase-desk/design-tokens';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type Key, type ReactNode, useRef } from 'react';
import { cn } from './cn.ts';

export interface VirtualListProps<T> {
  readonly items: ReadonlyArray<T>;
  readonly className?: string;
  readonly density?: DensityName;
  readonly estimateSize?: (index: number) => number;
  readonly getItemKey?: (item: T, index: number) => Key;
  readonly itemClassName?: string | ((item: T, index: number) => string | undefined);
  readonly overscan?: number;
  readonly renderItem: (item: T, index: number) => ReactNode;
}

export function VirtualList<T>(
  {
    className,
    density = 'compact',
    estimateSize,
    getItemKey,
    itemClassName,
    items,
    overscan = 8,
    renderItem,
  }: VirtualListProps<T>,
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
    <div ref={parentRef} className={cn('h-full overflow-auto', className)}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const item = items[row.index];
          if (item === undefined) return null;
          return (
            <div
              key={getItemKey?.(item, row.index) ?? row.key}
              className={typeof itemClassName === 'function'
                ? itemClassName(item, row.index)
                : itemClassName}
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
