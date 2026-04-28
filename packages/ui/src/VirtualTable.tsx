import { density as densityTokens, type DensityName } from '@firebase-desk/design-tokens';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Fragment, type Key, type MouseEvent, type ReactNode, useRef, useState } from 'react';
import { cn } from './cn.ts';

export interface VirtualTableColumn<T> {
  readonly id: string;
  readonly header: ReactNode;
  readonly cell: (row: T) => ReactNode;
  readonly maxWidth?: number;
  readonly minWidth?: number;
  readonly width?: number;
}

export interface VirtualTableProps<T> {
  readonly rows: ReadonlyArray<T>;
  readonly columns: ReadonlyArray<VirtualTableColumn<T>>;
  readonly className?: string;
  readonly density?: DensityName;
  readonly emptyState?: ReactNode;
  readonly enableColumnReorder?: boolean;
  readonly enableColumnResize?: boolean;
  readonly getRowKey?: (row: T, index: number) => Key;
  readonly headerClassName?: string;
  readonly onColumnReorder?: (activeColumnId: string, overColumnId: string) => void;
  readonly onColumnResize?: (columnId: string, width: number) => void;
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
    emptyState,
    enableColumnReorder = false,
    enableColumnResize = false,
    getRowKey,
    headerClassName,
    onColumnReorder,
    onColumnResize,
    onRowClick,
    onRowDoubleClick,
    rowClassName,
    rowHeight,
    rows,
    rowWrapper,
  }: VirtualTableProps<T>,
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isResizingColumn, setIsResizingColumn] = useState(false);
  const resolvedRowHeight = rowHeight ?? densityTokens[density].rowHeight;
  const tableWidth = tableContentWidth(columns);
  const tableWidthStyle = tableWidth === undefined
    ? { minWidth: '100%' }
    : { width: tableWidth, minWidth: '100%' };
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
          'sticky top-0 z-10 flex border-b border-border-subtle bg-bg-elevated text-xs font-semibold text-text-secondary shadow-sm',
          headerClassName,
        )}
        style={tableWidthStyle}
      >
        {columns.map((c) => (
          <div
            key={c.id}
            className={cn(
              'relative flex min-w-0 items-center border-r border-border-subtle px-2 py-1 last:border-r-0',
              enableColumnReorder && !isResizingColumn && 'cursor-grab active:cursor-grabbing',
              isResizingColumn && 'cursor-col-resize',
            )}
            draggable={enableColumnReorder && !isResizingColumn}
            style={{ flex: columnFlex(c) }}
            onDragOver={(event) => {
              if (!enableColumnReorder) return;
              event.preventDefault();
            }}
            onDragStart={(event) => {
              if (!enableColumnReorder) return;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', c.id);
            }}
            onDrop={(event) => {
              if (!enableColumnReorder) return;
              event.preventDefault();
              const activeColumnId = event.dataTransfer.getData('text/plain');
              if (activeColumnId && activeColumnId !== c.id) {
                onColumnReorder?.(activeColumnId, c.id);
              }
            }}
          >
            <span className='min-w-0 truncate'>{c.header}</span>
            {enableColumnResize && c.width !== undefined
              ? (
                <ColumnResizeHandle
                  column={c}
                  onResizeEnd={() => setIsResizingColumn(false)}
                  onResizeStart={() => setIsResizingColumn(true)}
                  onResize={(width) => onColumnResize?.(c.id, width)}
                />
              )
              : null}
          </div>
        ))}
      </div>
      <div
        className={cn(rows.length === 0 && 'grid place-items-center')}
        style={{
          minHeight: rows.length === 0 ? 'calc(100% - 28px)' : undefined,
          height: rows.length === 0 ? undefined : virtualizer.getTotalSize(),
          position: 'relative',
          ...tableWidthStyle,
        }}
      >
        {rows.length === 0 ? emptyState : null}
        {virtualizer.getVirtualItems().map((row) => {
          const item = rows[row.index];
          if (item === undefined) return null;
          const rowKey = getRowKey?.(item, row.index) ?? row.key;
          const rowElement = (
            <div
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
                  className='min-w-0 truncate border-r border-border-subtle px-2 py-1 last:border-r-0'
                  style={{ flex: columnFlex(c) }}
                >
                  {c.cell(item)}
                </div>
              ))}
            </div>
          );
          const wrapped = rowWrapper ? rowWrapper(rowElement, item, row.index) : rowElement;
          return <Fragment key={rowKey}>{wrapped}</Fragment>;
        })}
      </div>
    </div>
  );
}

function ColumnResizeHandle<T>(
  { column, onResize, onResizeEnd, onResizeStart }: {
    readonly column: VirtualTableColumn<T>;
    readonly onResize: (width: number) => void;
    readonly onResizeEnd: () => void;
    readonly onResizeStart: () => void;
  },
) {
  function startResize(event: MouseEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    onResizeStart();
    const startX = event.clientX;
    const startWidth = column.width ?? 160;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (moveEvent: globalThis.MouseEvent) => {
      onResize(clampWidth(startWidth + moveEvent.clientX - startX, column));
    };
    const onUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      onResizeEnd();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <span
      aria-label={`Resize ${String(column.header)}`}
      className='absolute -right-1 bottom-0 top-0 z-20 w-2 cursor-col-resize before:absolute before:bottom-1 before:left-1/2 before:top-1 before:w-px before:-translate-x-1/2 before:bg-border-subtle hover:before:bg-border-focus'
      role='separator'
      tabIndex={-1}
      onMouseDown={startResize}
    />
  );
}

function columnFlex<T>(column: VirtualTableColumn<T>): string | number {
  return column.width === undefined ? 1 : `0 0 ${column.width}px`;
}

function tableContentWidth<T>(columns: ReadonlyArray<VirtualTableColumn<T>>): number | undefined {
  if (columns.some((column) => column.width === undefined)) return undefined;
  return columns.reduce((total, column) => total + (column.width ?? 0), 0);
}

function clampWidth<T>(width: number, column: VirtualTableColumn<T>): number {
  return Math.min(column.maxWidth ?? 640, Math.max(column.minWidth ?? 72, Math.round(width)));
}
