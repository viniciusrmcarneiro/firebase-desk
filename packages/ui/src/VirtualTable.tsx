import { density as densityTokens, type DensityName } from '@firebase-desk/design-tokens';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type Key, type ReactNode, useRef } from 'react';
import { cn } from './cn.ts';

export interface VirtualTableColumn<T> {
  readonly id: string;
  readonly header: ReactNode;
  readonly cell: (row: T) => ReactNode;
  readonly width?: number;
}

export interface VirtualTableProps<T> {
  readonly rows: ReadonlyArray<T>;
  readonly columns: ReadonlyArray<VirtualTableColumn<T>>;
  readonly className?: string;
  readonly density?: DensityName;
  readonly getRowKey?: (row: T, index: number) => Key;
  readonly headerClassName?: string;
  readonly onRowClick?: (row: T) => void;
  readonly onRowDoubleClick?: (row: T) => void;
  readonly rowHeight?: number;
  readonly rowClassName?: string | ((row: T) => string | undefined);
  readonly rowWrapper?: (rowElement: ReactNode, row: T, index: number) => ReactNode;
}

export function VirtualTable<T>(
  {
    className,
    columns,
    density = 'compact',
    getRowKey,
    headerClassName,
    onRowClick,
    onRowDoubleClick,
    rowClassName,
    rowHeight,
    rows,
    rowWrapper,
  }: VirtualTableProps<T>,
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const resolvedRowHeight = rowHeight ?? densityTokens[density].rowHeight;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => resolvedRowHeight,
    overscan: 12,
  });

  return (
    <div ref={parentRef} className={cn('h-full overflow-auto', className)}>
      <div
        className={cn(
          'sticky top-0 z-10 flex border-b border-border-subtle bg-bg-panel text-xs font-semibold text-text-secondary',
          headerClassName,
        )}
      >
        {columns.map((c) => (
          <div
            key={c.id}
            className='min-w-0 px-2 py-1'
            style={{ flex: c.width ? `0 0 ${c.width}px` : 1 }}
          >
            {c.header}
          </div>
        ))}
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const item = rows[row.index];
          if (item === undefined) return null;
          const rowElement = (
            <div
              key={getRowKey?.(item, row.index) ?? row.key}
              className={cn(
                'flex border-b border-border-subtle text-sm text-text-primary hover:bg-action-ghost-hover',
                onRowClick && 'cursor-pointer',
                typeof rowClassName === 'function' ? rowClassName(item) : rowClassName,
              )}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${row.start}px)`,
                display: 'flex',
                height: resolvedRowHeight,
              }}
              onClick={() => onRowClick?.(item)}
              onDoubleClick={() => onRowDoubleClick?.(item)}
            >
              {columns.map((c) => (
                <div
                  key={c.id}
                  className='min-w-0 truncate px-2 py-1'
                  style={{ flex: c.width ? `0 0 ${c.width}px` : 1 }}
                >
                  {c.cell(item)}
                </div>
              ))}
            </div>
          );
          return rowWrapper ? rowWrapper(rowElement, item, row.index) : rowElement;
        })}
      </div>
    </div>
  );
}
