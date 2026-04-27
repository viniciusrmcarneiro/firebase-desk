import { type DensityName } from '@firebase-desk/design-tokens';
import {
  type Column,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Row,
  type Table,
  useReactTable,
} from '@tanstack/react-table';
import { type ReactNode, useMemo } from 'react';
import { cn } from '../cn.ts';
import { ContextMenu, ContextMenuTrigger } from '../context-menu/index.ts';
import { VirtualTable, type VirtualTableColumn } from '../VirtualTable.tsx';

export type DataTableColumn<TData> = ColumnDef<TData> & {
  readonly width?: number;
};

export interface DataTableProps<TData> {
  readonly columns: ReadonlyArray<DataTableColumn<TData>>;
  readonly data: ReadonlyArray<TData>;
  readonly density?: DensityName;
  readonly emptyState?: ReactNode;
  readonly getRowId?: (row: TData, index: number) => string;
  readonly onRowClick?: (row: TData) => void;
  readonly onRowDoubleClick?: (row: TData) => void;
  readonly rowContextMenu?: (row: TData) => ReactNode | null;
  readonly rowClassName?: string | ((row: TData) => string | undefined);
  readonly rowHeight?: number;
  readonly selectedRowId?: string | null;
}

export function DataTable<TData>(
  {
    columns,
    data,
    density,
    emptyState,
    getRowId,
    onRowClick,
    onRowDoubleClick,
    rowContextMenu,
    rowClassName,
    rowHeight,
    selectedRowId,
  }: DataTableProps<TData>,
) {
  const table = useReactTable({
    columns: columns as ColumnDef<TData>[],
    data: data as TData[],
    getCoreRowModel: getCoreRowModel(),
    ...(getRowId ? { getRowId: (row: TData, index: number) => getRowId(row, index) } : {}),
  });

  const virtualColumns = useMemo<ReadonlyArray<VirtualTableColumn<Row<TData>>>>(
    () =>
      table.getAllLeafColumns().map((column, columnIndex) => {
        const width = (column.columnDef as DataTableColumn<TData>).width;
        const tableColumn = {
          id: column.id,
          header: renderHeader(table, column),
          cell: (row: Row<TData>) => {
            const cell = row.getAllCells()[columnIndex];
            return cell ? flexRender(column.columnDef.cell, cell.getContext()) : null;
          },
        };
        return width === undefined ? tableColumn : { ...tableColumn, width };
      }),
    [columns, table],
  );

  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return <div className='grid h-full place-items-center'>{emptyState ?? 'No rows'}</div>;
  }

  return (
    <VirtualTable
      columns={virtualColumns}
      density={density ?? 'compact'}
      getRowKey={(row) => row.id}
      rowClassName={(row) =>
        cn(
          selectedRowId === row.id && 'bg-action-selected',
          typeof rowClassName === 'function' ? rowClassName(row.original) : rowClassName,
        )}
      {...(rowHeight === undefined ? {} : { rowHeight })}
      rows={rows}
      {...(rowContextMenu
        ? {
          rowWrapper: (rowElement: ReactNode, row: Row<TData>) => (
            wrapRowContextMenu(rowElement, row, rowContextMenu)
          ),
        }
        : {})}
      onRowClick={(row) => onRowClick?.(row.original)}
      onRowDoubleClick={(row) => onRowDoubleClick?.(row.original)}
    />
  );
}

function wrapRowContextMenu<TData>(
  rowElement: ReactNode,
  row: Row<TData>,
  rowContextMenu: (row: TData) => ReactNode | null,
): ReactNode {
  const content = rowContextMenu(row.original);
  if (!content) return rowElement;
  return (
    <ContextMenu key={row.id}>
      <ContextMenuTrigger asChild>{rowElement}</ContextMenuTrigger>
      {content}
    </ContextMenu>
  );
}

function renderHeader<TData>(table: Table<TData>, column: Column<TData>): ReactNode {
  const header = table.getHeaderGroups()[0]?.headers.find((item) => item.column.id === column.id);
  if (header) return flexRender(column.columnDef.header, header.getContext());
  return typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id;
}
