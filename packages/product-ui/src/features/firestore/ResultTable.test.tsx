import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ResultTable } from './ResultTable.tsx';

vi.mock('@firebase-desk/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@firebase-desk/ui')>();
  type Column = {
    readonly id: string;
    readonly header?: ReactNode | (() => ReactNode);
    readonly cell?: (context: { readonly row: { readonly original: unknown; }; }) => ReactNode;
  };
  return {
    ...actual,
    DataTable: (
      {
        columns,
        columnLayout,
        data,
        emptyState,
        getRowId,
        onColumnLayoutChange,
        onRowClick,
        onRowDoubleClick,
      }: {
        readonly columns: ReadonlyArray<Column>;
        readonly columnLayout?: {
          readonly columnOrder: ReadonlyArray<string>;
          readonly columnSizing: Readonly<Record<string, number>>;
        };
        readonly data: ReadonlyArray<unknown>;
        readonly emptyState?: ReactNode;
        readonly getRowId?: (row: unknown, index: number) => string;
        readonly onColumnLayoutChange?: (layout: {
          readonly columnOrder: ReadonlyArray<string>;
          readonly columnSizing: Readonly<Record<string, number>>;
        }) => void;
        readonly onRowClick?: (row: unknown) => void;
        readonly onRowDoubleClick?: (row: unknown) => void;
      },
    ) =>
      data.length
        ? (
          <div>
            <div data-testid='headers'>
              {columns.map((column) => (
                <span key={column.id} data-column-id={column.id}>
                  {typeof column.header === 'function' ? column.header() : column.header}
                </span>
              ))}
            </div>
            <pre data-testid='layout'>{JSON.stringify(columnLayout)}</pre>
            <button
              type='button'
              onClick={() =>
                onColumnLayoutChange?.({
                  columnOrder: columns.reduce<string[]>(
                    (order, column) => [column.id, ...order],
                    [],
                  ),
                  columnSizing: { id: 220 },
                })}
            >
              save layout
            </button>
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
        queryPath='orders'
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
        queryPath='orders'
        rows={[]}
        selectedDocumentPath={null}
        subcollectionStates={{}}
        onLoadMore={onLoadMore}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('hides subcollection column when no rows have subcollections', () => {
    render(
      <ResultTable
        hasMore={false}
        isFetchingMore={false}
        queryPath='orders'
        rows={[{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: { total: 10 },
          hasSubcollections: false,
        }]}
        selectedDocumentPath={null}
        subcollectionStates={{}}
        onLoadMore={() => {}}
      />,
    );

    expect(screen.getByTestId('headers').textContent).not.toContain('Subcollections');
  });

  it('does not render an open action column', () => {
    render(
      <ResultTable
        hasMore={false}
        isFetchingMore={false}
        queryPath='orders'
        rows={[{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: { total: 10 },
          hasSubcollections: true,
          subcollections: [{ id: 'events', path: 'orders/ord_1/events', documentCount: 0 }],
        }]}
        selectedDocumentPath={null}
        subcollectionStates={{}}
        onLoadMore={() => {}}
        onOpenDocumentInNewTab={() => {}}
      />,
    );

    const headerIds = Array.from(
      screen.getByTestId('headers').querySelectorAll('[data-column-id]'),
    ).map((item) => item.getAttribute('data-column-id'));
    expect(headerIds).not.toContain('actions');
    expect(headerIds.at(-1)).toBe('subcollections');
  });

  it('renders object values as compact content previews', () => {
    render(
      <ResultTable
        hasMore={false}
        isFetchingMore={false}
        queryPath='orders'
        rows={[{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: { payload: { nested: true } },
          hasSubcollections: false,
        }]}
        selectedDocumentPath={null}
        subcollectionStates={{}}
        onLoadMore={() => {}}
      />,
    );

    expect(screen.getByText('{"nested":true}')).toBeTruthy();
  });

  it('applies saved layout by collection key and can reset it', async () => {
    const settings = new MockSettingsRepository();
    await settings.save({
      resultTableLayouts: {
        'orders/skiers': {
          columnOrder: ['status', 'id'],
          columnSizing: { status: 240 },
        },
      },
    });

    render(
      <ResultTable
        hasMore={false}
        isFetchingMore={false}
        queryPath='orders/ord_1/skiers'
        rows={[{
          id: 'skier_1',
          path: 'orders/ord_1/skiers/skier_1',
          data: { status: 'active' },
          hasSubcollections: false,
        }]}
        selectedDocumentPath={null}
        settings={settings}
        subcollectionStates={{}}
        onLoadMore={() => {}}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Reset table layout' })).toBeTruthy();
    expect(screen.getByTestId('layout').textContent).toContain('"status"');

    fireEvent.click(screen.getByRole('button', { name: 'Reset table layout' }));

    expect(screen.queryByRole('button', { name: 'Reset table layout' })).toBeNull();
  });
});
