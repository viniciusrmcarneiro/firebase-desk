import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn, sanitizeDataTableColumnLayout } from './DataTable.tsx';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (
    { count, estimateSize }: { count: number; estimateSize: (i: number) => number; },
  ) => {
    const size = count > 0 ? estimateSize(0) : 0;
    return {
      getTotalSize: () => count * size,
      getVirtualItems: () =>
        Array.from({ length: count }, (_, i) => ({ index: i, key: i, start: i * size, size })),
    };
  },
}));

interface RowModel {
  readonly id: string;
  readonly name: string;
  readonly status?: string;
}

const columns: ReadonlyArray<DataTableColumn<RowModel>> = [
  { id: 'name', header: 'Name', cell: (info) => info.row.original.name },
];

describe('DataTable', () => {
  it('renders rows and handles row clicks', () => {
    const onRowClick = vi.fn();
    render(
      <div className='h-60'>
        <DataTable
          columns={columns}
          data={[{ id: '1', name: 'Ada' }]}
          getRowId={(row) => row.id}
          onRowClick={onRowClick}
        />
      </div>,
    );
    fireEvent.click(screen.getByText('Ada'));
    expect(onRowClick).toHaveBeenCalledWith({ id: '1', name: 'Ada' });
  });

  it('applies row classes and allows empty row context menus', () => {
    const { container } = render(
      <div className='h-60'>
        <DataTable
          columns={columns}
          data={[{ id: '1', name: 'Ada' }]}
          getRowId={(row) => row.id}
          rowClassName={(row) => row.id === '1' ? 'match-row' : undefined}
          rowContextMenu={() => null}
        />
      </div>,
    );

    expect(container.querySelector('.match-row')?.textContent).toContain('Ada');
  });

  it('updates rendered columns when column definitions change', () => {
    const { rerender } = render(
      <div className='h-60'>
        <DataTable
          columns={columns}
          data={[{ id: '1', name: 'Ada', status: 'active' }]}
          getRowId={(row) => row.id}
        />
      </div>,
    );

    expect(screen.queryByText('active')).toBeNull();

    rerender(
      <div className='h-60'>
        <DataTable
          columns={[
            ...columns,
            {
              id: 'status',
              header: 'Status',
              cell: (info) => info.row.original.status,
            },
          ]}
          data={[{ id: '1', name: 'Ada', status: 'active' }]}
          getRowId={(row) => row.id}
        />
      </div>,
    );

    expect(screen.getByText('active')).toBeTruthy();
  });

  it('renders an empty state', () => {
    render(<DataTable columns={columns} data={[]} emptyState='No data' />);
    expect(screen.getByText('No data')).toBeTruthy();
  });

  it('emits resized column layouts', () => {
    const onColumnLayoutChange = vi.fn();
    render(
      <div className='h-60'>
        <DataTable
          columns={[{ ...columns[0]!, width: 160 }]}
          data={[{ id: '1', name: 'Ada' }]}
          enableColumnResize
          onColumnLayoutChange={onColumnLayoutChange}
        />
      </div>,
    );

    fireEvent.mouseDown(screen.getByRole('separator'), { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 132 });

    expect(onColumnLayoutChange).toHaveBeenCalledWith({
      columnOrder: ['name'],
      columnSizing: { name: 192 },
    });
  });

  it('emits reordered column layouts', () => {
    const onColumnLayoutChange = vi.fn();
    render(
      <div className='h-60'>
        <DataTable
          columns={[
            ...columns,
            { id: 'status', header: 'Status', cell: (info) => info.row.original.status },
          ]}
          data={[{ id: '1', name: 'Ada', status: 'active' }]}
          enableColumnReorder
          onColumnLayoutChange={onColumnLayoutChange}
        />
      </div>,
    );
    const data = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'move',
      getData: (type: string) => data.get(type) ?? '',
      setData: (type: string, value: string) => data.set(type, value),
    };

    fireEvent.dragStart(screen.getByText('Status').parentElement!, { dataTransfer });
    fireEvent.drop(screen.getByText('Name').parentElement!, { dataTransfer });

    expect(onColumnLayoutChange).toHaveBeenCalledWith({
      columnOrder: ['status', 'name'],
      columnSizing: {},
    });
  });

  it('sanitizes stale saved column layouts and inserts new columns near defaults', () => {
    expect(
      sanitizeDataTableColumnLayout(
        [
          { id: 'id', header: 'ID', cell: () => null },
          { id: 'name', header: 'Name', cell: () => null, minWidth: 90 },
          { id: 'status', header: 'Status', cell: () => null },
          { id: 'total', header: 'Total', cell: () => null, maxWidth: 300 },
        ],
        {
          columnOrder: ['total', 'id', 'missing'],
          columnSizing: { name: 10, total: 999, missing: 120 },
        },
      ),
    ).toEqual({
      columnOrder: ['total', 'id', 'name', 'status'],
      columnSizing: { name: 90, total: 300 },
    });
  });
});
