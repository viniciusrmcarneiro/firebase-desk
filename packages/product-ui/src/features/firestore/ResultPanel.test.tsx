import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SubcollectionLoadState } from './resultModel.tsx';
import { ResultPanel } from './ResultPanel.tsx';

vi.mock('./ResultTable.tsx', () => ({
  ResultTable: (
    { rows }: { readonly rows: ReadonlyArray<FirestoreDocumentResult>; },
  ) => <div data-testid='table'>{rows.length} rows</div>,
}));

vi.mock('./ResultTreeView.tsx', () => ({
  ResultTreeView: (
    {
      expandedIds,
      onToggleNode,
      rows,
    }: {
      readonly expandedIds: ReadonlySet<string>;
      readonly onToggleNode: (id: string) => void;
      readonly rows: ReadonlyArray<FirestoreDocumentResult>;
      readonly subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>;
    },
  ) => (
    <div>
      <div data-testid='expanded'>{Array.from(expandedIds).join('|')}</div>
      <button type='button' onClick={() => onToggleNode(`doc:${rows[0]?.path ?? ''}`)}>
        tree
      </button>
    </div>
  ),
}));

describe('ResultPanel', () => {
  it('renders table and error state', () => {
    render(
      <ResultPanel
        errorMessage='Could not query'
        hasMore={false}
        isFetchingMore={false}
        isLoading={false}
        queryPath='orders'
        resultView='table'
        rows={[]}
        selectedDocumentPath={null}
        subcollectionStates={{}}
        onLoadMore={() => {}}
        onResultViewChange={() => {}}
      />,
    );

    expect(screen.getByText('Could not query')).toBeTruthy();
    expect(screen.getByTestId('table').textContent).toBe('0 rows');
  });

  it('loads subcollections when expanding tree document', () => {
    const onLoadSubcollections = vi.fn();

    render(
      <ResultPanel
        errorMessage={null}
        hasMore={false}
        isFetchingMore={false}
        isLoading={false}
        queryPath='orders'
        resultView='tree'
        rows={[{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: {},
          hasSubcollections: true,
        }]}
        selectedDocumentPath={null}
        subcollectionStates={{}}
        onLoadMore={() => {}}
        onLoadSubcollections={onLoadSubcollections}
        onResultViewChange={() => {}}
      />,
    );

    expect(screen.getByTestId('expanded').textContent).toContain('root:orders');
    expect(screen.getByTestId('expanded').textContent).toContain('doc:orders/ord_1');

    fireEvent.click(screen.getByRole('button', { name: 'tree' }));
    fireEvent.click(screen.getByRole('button', { name: 'tree' }));

    expect(onLoadSubcollections).toHaveBeenCalledWith('orders/ord_1');
  });

  it('renders json results in a full-size tab pane', async () => {
    render(
      <ResultPanel
        errorMessage={null}
        hasMore={false}
        isFetchingMore={false}
        isLoading={false}
        queryPath='orders'
        resultView='json'
        rows={[]}
        selectedDocumentPath={null}
        subcollectionStates={{}}
        onLoadMore={() => {}}
        onResultViewChange={() => {}}
      />,
    );

    const preview = await screen.findByLabelText('JSON results');
    expect(preview.className).toContain('h-full');
    expect(preview.closest('[role="tabpanel"]')?.className).toContain('col-start-1');
  });
});
