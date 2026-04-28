import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ResultTable } from './ResultTable.tsx';

vi.mock('@firebase-desk/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@firebase-desk/ui')>();
  type Column = {
    readonly id: string;
    readonly cell?: (context: { readonly row: { readonly original: unknown; }; }) => ReactNode;
  };
  return {
    ...actual,
    DataTable: (
      {
        columns,
        data,
        emptyState,
        getRowId,
        onRowClick,
        onRowDoubleClick,
      }: {
        readonly columns: ReadonlyArray<Column>;
        readonly data: ReadonlyArray<unknown>;
        readonly emptyState?: ReactNode;
        readonly getRowId?: (row: unknown, index: number) => string;
        readonly onRowClick?: (row: unknown) => void;
        readonly onRowDoubleClick?: (row: unknown) => void;
      },
    ) =>
      data.length
        ? (
          <div>
            {data.map((row, index) => (
              <div
                key={getRowId?.(row, index) ?? index}
                data-testid='row'
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
              >
                {columns.map((column) => (
                  <span key={column.id}>{column.cell?.({ row: { original: row } })}</span>
                ))}
              </div>
            ))}
          </div>
        )
        : <>{emptyState}</>,
  };
});

describe('ResultTable', () => {
  it('selects and edits document rows', () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();

    render(
      <ResultTable
        hasMore={false}
        isFetchingMore={false}
        rows={[{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: { total: 10 },
          hasSubcollections: false,
        }]}
        selectedDocumentPath={null}
        subcollectionStates={{}}
        onEditDocument={onEdit}
        onLoadMore={() => {}}
        onSelectDocument={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('row'));
    fireEvent.doubleClick(screen.getByTestId('row'));

    expect(onSelect).toHaveBeenCalledWith('orders/ord_1');
    expect(onEdit).toHaveBeenCalledWith(
      { id: 'ord_1', path: 'orders/ord_1', data: { total: 10 }, hasSubcollections: false },
    );
  });

  it('renders pagination action', () => {
    const onLoadMore = vi.fn();

    render(
      <ResultTable
        hasMore
        isFetchingMore={false}
        rows={[]}
        selectedDocumentPath={null}
        subcollectionStates={{}}
        onLoadMore={onLoadMore}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
