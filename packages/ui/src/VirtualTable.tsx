import { useVirtualizer } from '@tanstack/react-virtual';
import { type ReactNode, useRef } from 'react';

export interface VirtualTableColumn<T> {
  readonly id: string;
  readonly header: ReactNode;
  readonly cell: (row: T) => ReactNode;
  readonly width?: number;
}

export interface VirtualTableProps<T> {
  readonly rows: ReadonlyArray<T>;
  readonly columns: ReadonlyArray<VirtualTableColumn<T>>;
  readonly rowHeight: number;
}

export function VirtualTable<T>({ rows, columns, rowHeight }: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  return (
    <div ref={parentRef} style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex' }}>
        {columns.map((c) => (
          <div key={c.id} style={{ flex: c.width ? `0 0 ${c.width}px` : 1 }}>
            {c.header}
          </div>
        ))}
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const item = rows[row.index];
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
                display: 'flex',
                height: rowHeight,
              }}
            >
              {columns.map((c) => (
                <div key={c.id} style={{ flex: c.width ? `0 0 ${c.width}px` : 1 }}>
                  {c.cell(item)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
