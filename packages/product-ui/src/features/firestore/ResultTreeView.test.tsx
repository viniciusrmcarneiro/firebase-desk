import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ResultTreeRowModel } from './resultModel.tsx';
import { ResultTreeView } from './ResultTreeView.tsx';

vi.mock('@firebase-desk/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@firebase-desk/ui')>();
  return {
    ...actual,
    ContextMenuContent: ({ children }: { readonly children: ReactNode; }) => <div>{children}</div>,
    ContextMenuItem: (
      { children, onSelect }: {
        readonly children: ReactNode;
        readonly onSelect?: () => void;
      },
    ) => <button type='button' onClick={() => onSelect?.()}>{children}</button>,
    ContextMenuSeparator: () => <hr />,
    ExplorerTree: (
      {
        contextMenu,
        onSelect,
        renderAction,
        rows,
      }: {
        readonly contextMenu?: (node: ResultTreeRowModel) => ReactNode | null;
        readonly onSelect?: (id: string) => void;
        readonly renderAction?: (node: ResultTreeRowModel) => ReactNode;
        readonly rows: ReadonlyArray<ResultTreeRowModel>;
      },
    ) => (
      <div>
        {rows.map((node) => (
          <div key={node.id}>
            <button type='button' onClick={() => onSelect?.(node.id)}>{node.label}</button>
            {renderAction?.(node)}
            {contextMenu?.(node)}
          </div>
        ))}
      </div>
    ),
  };
});

describe('ResultTreeView', () => {
  it('adds delete document to tree rows and context menus', () => {
    const onDeleteDocument = vi.fn();
    const document: FirestoreDocumentResult = {
      id: 'ord_1',
      path: 'orders/ord_1',
      data: {},
      hasSubcollections: false,
    };

    render(
      <ResultTreeView
        expandedIds={new Set(['root:orders'])}
        hasMore={false}
        isFetchingMore={false}
        queryPath='orders'
        rows={[document]}
        subcollectionStates={{}}
        onDeleteDocument={onDeleteDocument}
        onLoadMore={() => {}}
        onToggleNode={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete ord_1' }));
    fireEvent.click(screen.getByRole('button', { name: /Delete document/ }));

    expect(onDeleteDocument).toHaveBeenNthCalledWith(1, document);
    expect(onDeleteDocument).toHaveBeenNthCalledWith(2, document);
  });

  it('shows field and document sections for field rows', () => {
    render(
      <ResultTreeView
        expandedIds={new Set(['root:orders', 'doc:orders/ord_1', 'doc:orders/ord_1:fields'])}
        hasMore={false}
        isFetchingMore={false}
        queryPath='orders'
        rows={[{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: { total: 10 },
          hasSubcollections: false,
        }]}
        subcollectionStates={{}}
        onDeleteDocument={() => {}}
        onDeleteField={() => {}}
        onLoadMore={() => {}}
        onOpenDocumentInNewTab={() => {}}
        onSelectDocument={() => {}}
        onToggleNode={() => {}}
      />,
    );

    expect(screen.getAllByText('Field').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Document').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delete field').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delete document').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Delete total' })).toBeNull();
  });

  it('selects the owning document from field rows', () => {
    const onSelectDocument = vi.fn();

    render(
      <ResultTreeView
        expandedIds={new Set(['root:orders', 'doc:orders/ord_1', 'doc:orders/ord_1:fields'])}
        hasMore={false}
        isFetchingMore={false}
        queryPath='orders'
        rows={[{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: { total: 10 },
          hasSubcollections: false,
        }]}
        subcollectionStates={{}}
        onLoadMore={() => {}}
        onSelectDocument={onSelectDocument}
        onToggleNode={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'total' }));

    expect(onSelectDocument).toHaveBeenCalledWith('orders/ord_1');
  });
});
