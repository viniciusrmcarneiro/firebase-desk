import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  ProjectSummary,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';
import { AUTH_USERS, MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Key, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../appearance/AppearanceProvider.tsx';
import { AuthUsersSurface } from './auth/AuthUsersSurface.tsx';
import {
  type FirestoreQueryDraft,
  FirestoreQuerySurface,
} from './firestore/FirestoreQuerySurface.tsx';
import { JS_QUERY_SAMPLE_SOURCE, JsQuerySurface } from './js-query/JsQuerySurface.tsx';
import { AccountTree } from './projects/AccountTree.tsx';
import { WorkspaceTabStrip } from './tabs/WorkspaceTabStrip.tsx';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (
    { count, estimateSize }: {
      readonly count: number;
      readonly estimateSize: (i: number) => number;
    },
  ) => {
    const size = count > 0 ? estimateSize(0) : 0;
    return {
      getTotalSize: () => count * size,
      getVirtualItems: () =>
        Array.from({ length: count }, (_, i) => ({ index: i, key: i, start: i * size, size })),
    };
  },
}));

vi.mock('@monaco-editor/react', () => ({
  default: (
    {
      onChange,
      value,
    }: {
      readonly onChange?: (value: string) => void;
      readonly value: string;
    },
  ) => (
    <textarea
      data-testid='monaco'
      value={value}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
}));

vi.mock('@firebase-desk/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@firebase-desk/ui')>();
  type DataTableColumnMock = {
    readonly id: string;
    readonly header?: unknown;
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
        readonly columns: ReadonlyArray<DataTableColumnMock>;
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
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
              >
                {columns.map((column) => (
                  <span key={column.id}>
                    {column.cell?.({ row: { original: row } })}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )
        : <>{emptyState ?? null}</>,
    VirtualList: (
      {
        getItemKey,
        items,
        renderItem,
      }: {
        readonly getItemKey?: (item: unknown, index: number) => Key;
        readonly items: ReadonlyArray<unknown>;
        readonly renderItem: (item: unknown, index: number) => ReactNode;
      },
    ) => (
      <div>
        {items.map((item, index) => (
          <div key={getItemKey?.(item, index) ?? index}>{renderItem(item, index)}</div>
        ))}
      </div>
    ),
    VirtualTree: (
      {
        ariaLabel,
        flattenedNodes,
        onOpen,
        onSelect,
        onToggle,
        renderNode,
      }: {
        readonly ariaLabel?: string;
        readonly flattenedNodes: ReadonlyArray<{
          readonly id: string;
          readonly hasChildren: boolean;
          readonly label: string;
        }>;
        readonly onOpen?: (id: string) => void;
        readonly onSelect?: (id: string) => void;
        readonly onToggle: (id: string) => void;
        readonly renderNode?: (node: unknown) => ReactNode;
      },
    ) => (
      <div aria-label={ariaLabel} role='tree'>
        {flattenedNodes.map((node) => (
          <div
            key={node.id}
            role='treeitem'
            onClick={() => {
              onSelect?.(node.id);
              if (node.hasChildren) onToggle(node.id);
            }}
            onDoubleClick={() => onOpen?.(node.id)}
          >
            {renderNode ? renderNode(node) : node.label}
          </div>
        ))}
      </div>
    ),
  };
});

const projects: ReadonlyArray<ProjectSummary> = [
  {
    id: 'emu',
    name: 'Local Emulator',
    projectId: 'demo-local',
    target: 'emulator',
    emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
    hasCredential: false,
    credentialEncrypted: null,
    createdAt: '2026-04-27T00:00:00.000Z',
  },
  {
    id: 'prod',
    name: 'Acme Prod',
    projectId: 'acme-prod',
    target: 'production',
    hasCredential: true,
    credentialEncrypted: true,
    createdAt: '2026-04-27T00:00:00.000Z',
  },
];

const nestedEvent: FirestoreDocumentResult = {
  id: 'evt_created',
  path: 'orders/ord_1024/events/evt_created',
  data: { type: 'created' },
  hasSubcollections: false,
};

const encodedUpdatedAt = {
  __type__: 'timestamp',
  value: '2026-04-24T09:30:12.058Z',
};

const documents: ReadonlyArray<FirestoreDocumentResult> = [
  {
    id: 'ord_1024',
    path: 'orders/ord_1024',
    data: {
      status: 'paid',
      total: 129.4,
      updatedAt: encodedUpdatedAt,
      deliveryLocation: { __type__: 'geoPoint', latitude: -36.8485, longitude: 174.7633 },
      customerRef: { __type__: 'reference', path: 'customers/cus_ada' },
      meta: { channel: 'web' },
      tags: ['priority'],
    },
    hasSubcollections: true,
    subcollections: [
      {
        id: 'events',
        path: 'orders/ord_1024/events',
        documentCount: 1,
        documents: [nestedEvent],
      } as FirestoreCollectionNode & {
        readonly documents: ReadonlyArray<FirestoreDocumentResult>;
      },
    ],
  },
  {
    id: 'ord_1025',
    path: 'orders/ord_1025',
    data: { status: 'pending', total: 42 },
    hasSubcollections: false,
  },
];

const draft: FirestoreQueryDraft = {
  path: 'orders',
  filters: [{ id: 'filter-1', field: 'status', op: '==', value: 'paid' }],
  filterField: 'status',
  filterOp: '==',
  filterValue: 'paid',
  limit: 25,
  sortDirection: 'desc',
  sortField: 'updatedAt',
};

const scriptResult: ScriptRunResult = {
  returnValue: documents,
  stream: [
    {
      id: 'yield-document-snapshot',
      label: 'yield DocumentSnapshot',
      badge: 'orders/ord_1024',
      view: 'json',
      value: documents[0],
    },
    {
      id: 'yield-query-snapshot',
      label: 'yield QuerySnapshot',
      badge: 'orders where status == paid',
      view: 'table',
      value: documents,
    },
  ],
  logs: [{ level: 'info', message: 'Fetched 2 orders', timestamp: '2026-04-27T10:41:03.000Z' }],
  errors: [],
  durationMs: 4,
};

function expectedUserTimestamp(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    second: '2-digit',
    timeZoneName: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function renderWithAppearance(ui: ReactNode) {
  render(
    <AppearanceProvider settings={new MockSettingsRepository()}>
      {ui}
    </AppearanceProvider>,
  );
}

describe('feature surfaces', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it('AccountTree forwards selection, toggle, and add actions', () => {
    const onAddProject = vi.fn();
    const onSelectItem = vi.fn();
    const onToggleItem = vi.fn();
    render(
      <AccountTree
        filterValue=''
        items={[
          {
            id: 'project:emu',
            kind: 'project',
            label: 'Local Emulator',
            depth: 0,
            hasChildren: true,
            expanded: true,
            projectTarget: 'emulator',
          },
          {
            id: 'firestore:emu',
            kind: 'firestore',
            label: 'Firestore',
            depth: 1,
            hasChildren: true,
            expanded: false,
          },
        ]}
        onAddProject={onAddProject}
        onFilterChange={() => {}}
        onOpenItem={() => {}}
        onRefreshItem={() => {}}
        onRemoveItem={() => {}}
        onSelectItem={onSelectItem}
        onToggleItem={onToggleItem}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    fireEvent.click(screen.getByText('Firestore'));

    expect(onAddProject).toHaveBeenCalledTimes(1);
    expect(onSelectItem).toHaveBeenCalledWith('firestore:emu');
    expect(onToggleItem).toHaveBeenCalledWith('firestore:emu');
  });

  it('WorkspaceTabStrip switches and closes tabs', () => {
    const onSelectTab = vi.fn();
    const onCloseTab = vi.fn();
    const onPointerDown = vi.fn();
    render(
      <div onPointerDown={onPointerDown}>
        <WorkspaceTabStrip
          activeTabId='tab-firestore'
          projects={projects}
          tabs={[
            { id: 'tab-firestore', kind: 'firestore-query', title: 'orders', projectId: 'emu' },
            { id: 'tab-auth', kind: 'auth-users', title: 'Auth', projectId: 'emu' },
          ]}
          onCloseAllTabs={() => {}}
          onCloseOtherTabs={() => {}}
          onCloseTab={onCloseTab}
          onCloseTabsToLeft={() => {}}
          onCloseTabsToRight={() => {}}
          onReorderTabs={() => {}}
          onSelectTab={onSelectTab}
          onSortByProject={() => {}}
        />
      </div>,
    );

    fireEvent.click(screen.getByText('Auth'));
    const closeAuthButton = screen.getByRole('button', { name: 'Close Auth' });
    fireEvent.pointerDown(closeAuthButton);
    fireEvent.click(closeAuthButton);

    expect(onSelectTab).toHaveBeenCalledWith('tab-auth');
    expect(onPointerDown).not.toHaveBeenCalled();
    expect(onCloseTab).toHaveBeenCalledWith('tab-auth');
  });

  it('AuthUsersSurface filters, selects users, and exposes Load more', () => {
    const onSelectUser = vi.fn();
    const onLoadMore = vi.fn();
    render(
      <AuthUsersSurface
        filterValue='grace'
        hasMore
        users={AUTH_USERS}
        onFilterChange={() => {}}
        onLoadMore={onLoadMore}
        onSelectUser={onSelectUser}
      />,
    );

    expect(screen.getAllByText('Grace Hopper').length).toBeGreaterThan(0);
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
    fireEvent.click(screen.getAllByText('Grace Hopper')[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(onSelectUser).toHaveBeenCalledWith('u_grace');
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('FirestoreQuerySurface selects rows, opens editor, and renders nested subcollection docs', async () => {
    const onSelectDocument = vi.fn();
    const onSaveDocument = vi.fn();
    const selectedDocument = documents[0]!;
    renderWithAppearance(
      <FirestoreQuerySurface
        draft={draft}
        hasMore
        rows={documents}
        selectedDocument={selectedDocument}
        onDraftChange={() => {}}
        onLoadMore={() => {}}
        onOpenDocumentInNewTab={() => {}}
        onReset={() => {}}
        onRun={() => {}}
        onSaveDocument={onSaveDocument}
        onSelectDocument={onSelectDocument}
      />,
    );

    const orderCell = screen.getAllByText('ord_1024')[0]!;
    fireEvent.click(orderCell);
    expect(onSelectDocument).toHaveBeenCalledWith('orders/ord_1024');

    const treeTab = screen.getByRole('tab', { name: /Tree/ });
    fireEvent.mouseDown(treeTab, { button: 0, ctrlKey: false });
    expect(await screen.findByText('evt_created')).toBeTruthy();

    const tableTab = screen.getByRole('tab', { name: /Table/ });
    fireEvent.mouseDown(tableTab, { button: 0, ctrlKey: false });
    fireEvent.doubleClick(screen.getAllByText('ord_1024')[0]!);
    expect(await screen.findByRole('dialog', { name: 'Document editor' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save mock' }));
    expect(onSaveDocument).toHaveBeenCalledWith(
      'orders/ord_1024',
      expect.objectContaining({ status: 'paid' }),
    );
  });

  it('FirestoreQuerySurface renders encoded Firestore values as typed cells', () => {
    renderWithAppearance(
      <FirestoreQuerySurface
        draft={draft}
        hasMore={false}
        rows={documents}
        onDraftChange={() => {}}
        onLoadMore={() => {}}
        onOpenDocumentInNewTab={() => {}}
        onReset={() => {}}
        onRun={() => {}}
        onSelectDocument={() => {}}
      />,
    );

    expect(screen.getAllByText('time').length).toBeGreaterThan(0);
    expect(screen.getByText(expectedUserTimestamp(encodedUpdatedAt.value))).toBeTruthy();
    expect(screen.getByText('geo')).toBeTruthy();
    expect(screen.getByText('-36.8485, 174.7633')).toBeTruthy();
    expect(screen.getByText('ref')).toBeTruthy();
    expect(screen.getByText('customers/cus_ada')).toBeTruthy();
    expect(screen.queryByText(/__type__/)).toBeNull();
  });

  it('JsQuerySurface renders run action, editor, logs, and streamed result cards', async () => {
    const onRun = vi.fn();
    renderWithAppearance(
      <JsQuerySurface
        result={scriptResult}
        source={JS_QUERY_SAMPLE_SOURCE}
        onRun={onRun}
        onSourceChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('monaco')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('yield DocumentSnapshot')).toBeTruthy());
    expect(screen.getByRole('tab', { name: /Logs/ })).toBeTruthy();
  });
});
