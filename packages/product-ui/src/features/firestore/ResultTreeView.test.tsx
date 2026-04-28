import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ResultTreeView } from './ResultTreeView.tsx';

vi.mock('@firebase-desk/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@firebase-desk/ui')>();
  return {
    ...actual,
    ExplorerTree: (
      {
        onToggle,
        renderAction,
        rows,
      }: {
        readonly onToggle: (id: string) => void;
        readonly renderAction?: (node: {
          readonly id: string;
          readonly label: ReactNode;
        }) => ReactNode;
        readonly rows: ReadonlyArray<{
          readonly id: string;
          readonly label: ReactNode;
        }>;
      },
    ) => (
      <div role='tree'>
        {rows.map((row) => (
          <div key={row.id} role='treeitem' onClick={() => onToggle(row.id)}>
            <span>{row.label}</span>
            {renderAction?.(row)}
          </div>
        ))}
      </div>
    ),
  };
});

describe('ResultTreeView', () => {
  it('renders load more action', () => {
    const onLoadMore = vi.fn();

    render(
      <ResultTreeView
        expandedIds={new Set(['root:orders'])}
        hasMore
        isFetchingMore={false}
        queryPath='orders'
        rows={[]}
        subcollectionStates={{}}
        onLoadMore={onLoadMore}
        onToggleNode={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('renders lazy subcollection load action', () => {
    const onLoadSubcollections = vi.fn();

    render(
      <ResultTreeView
        expandedIds={new Set(['root:orders', 'doc:orders/ord_1'])}
        hasMore={false}
        isFetchingMore={false}
        queryPath='orders'
        rows={[{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: {},
          hasSubcollections: true,
        }]}
        subcollectionStates={{}}
        onLoadMore={() => {}}
        onLoadSubcollections={onLoadSubcollections}
        onToggleNode={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Load/ }));

    expect(onLoadSubcollections).toHaveBeenCalledWith('orders/ord_1');
  });
});
