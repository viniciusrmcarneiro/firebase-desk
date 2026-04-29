import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { AppearanceProvider } from '@firebase-desk/product-ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell.tsx';
import { createAppQueryClient } from './queryClient.ts';
import {
  createMockRepositories,
  RepositoryProvider,
  type RepositorySet,
} from './RepositoryProvider.tsx';
import { selectionActions, selectionStore } from './stores/selectionStore.ts';
import { tabActions } from './stores/tabsStore.ts';

type MockSurfaceAction = 'create' | 'delete' | 'patch' | 'save';

interface MockSurfaceProps {
  readonly onCreateDocument?: (
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ) => Promise<void> | void;
  readonly onDeleteDocument?: (
    documentPath: string,
    options: {
      readonly deleteDescendantDocumentPaths: ReadonlyArray<string>;
      readonly deleteSubcollectionPaths: ReadonlyArray<string>;
    },
  ) => Promise<void> | void;
  readonly onSaveDocument?: (
    documentPath: string,
    data: Record<string, unknown>,
    options?: { readonly lastUpdateTime?: string; },
  ) => Promise<unknown> | unknown;
  readonly onUpdateDocumentFields?: (
    documentPath: string,
    operations: ReadonlyArray<{
      readonly baseValue: unknown;
      readonly fieldPath: ReadonlyArray<string>;
      readonly type: 'delete' | 'set';
      readonly value?: unknown;
    }>,
    options: { readonly lastUpdateTime?: string; readonly staleBehavior: 'save-and-notify'; },
  ) => Promise<unknown> | unknown;
}

const surfaceState = vi.hoisted(() => ({
  action: 'save' as MockSurfaceAction,
}));

vi.mock('@firebase-desk/product-ui', async (importOriginal) => {
  const [actual, React] = await Promise.all([
    importOriginal<typeof import('@firebase-desk/product-ui')>(),
    import('react'),
  ]);
  return {
    ...actual,
    FirestoreQuerySurface: (props: MockSurfaceProps) =>
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: async () => {
            if (surfaceState.action === 'create') {
              await props.onCreateDocument?.('orders', 'ord_created', { status: 'new' });
              return;
            }
            if (surfaceState.action === 'delete') {
              void props.onDeleteDocument?.('orders/ord_1024', {
                deleteDescendantDocumentPaths: ['orders/ord_1024/events/event_1'],
                deleteSubcollectionPaths: ['orders/ord_1024/events'],
              });
              return;
            }
            if (surfaceState.action === 'patch') {
              void props.onUpdateDocumentFields?.('orders/ord_1024', [{
                baseValue: 'draft',
                fieldPath: ['status'],
                type: 'set',
                value: 'paid',
              }], { staleBehavior: 'save-and-notify' });
              return;
            }
            void props.onSaveDocument?.('orders/ord_1024', { status: 'paid' });
          },
        },
        'Trigger Firestore write',
      ),
  };
});

vi.mock('@monaco-editor/react', async () => {
  const React = await import('react');
  return {
    default: (
      {
        onChange,
        value,
      }: {
        readonly onChange?: (value: string) => void;
        readonly value: string;
      },
    ) =>
      React.createElement('textarea', {
        'aria-label': 'Code editor',
        onChange: (event: { currentTarget: { value: string; }; }) =>
          onChange?.(event.currentTarget.value),
        value,
      }),
  };
});

afterEach(() => {
  surfaceState.action = 'save';
  selectionActions.reset();
  tabActions.reset();
  vi.unstubAllGlobals();
});

function renderShell(
  {
    dataMode = 'mock',
    repositories = createMockRepositories(),
  }: {
    readonly dataMode?: 'live' | 'mock';
    readonly repositories?: RepositorySet;
  } = {},
) {
  window.localStorage.clear();
  tabActions.reset();
  selectionActions.reset();
  tabActions.openTab({ kind: 'firestore-query', connectionId: 'emu', path: 'orders' });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const queryClient = createAppQueryClient();
  render(
    <RepositoryProvider repositories={repositories}>
      <QueryClientProvider client={queryClient}>
        <HotkeysProvider settings={repositories.settings}>
          <AppearanceProvider settings={repositories.settings}>
            <AppShell dataMode={dataMode} />
          </AppearanceProvider>
        </HotkeysProvider>
      </QueryClientProvider>
    </RepositoryProvider>,
  );
  return { queryClient };
}

describe('desktop AppShell Firestore writes', () => {
  it('deletes a Firestore document with selected subcollections through one repository call', async () => {
    surfaceState.action = 'delete';
    const repositories = createMockRepositories();
    const deleteDocument = vi.spyOn(repositories.firestore, 'deleteDocument');
    selectionActions.selectDocument('orders/ord_1024');
    renderShell({ repositories });

    await waitFor(() => expect(screen.getAllByText('Local Emulator').length).toBeGreaterThan(0));
    fireEvent.click(await screen.findByRole('button', { name: 'Trigger Firestore write' }));

    await waitFor(() =>
      expect(deleteDocument).toHaveBeenCalledWith('emu', 'orders/ord_1024', {
        deleteSubcollectionPaths: ['orders/ord_1024/events'],
      })
    );
    expect(deleteDocument).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(selectionStore.state.firestoreDocumentPath).toBeNull());
  });

  it('saves a Firestore document and invalidates live Firestore queries', async () => {
    surfaceState.action = 'save';
    const repositories = createMockRepositories();
    const saveDocument = vi.spyOn(repositories.firestore, 'saveDocument');
    const { queryClient } = renderShell({ dataMode: 'live', repositories });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await waitFor(() => expect(screen.getAllByText('Local Emulator').length).toBeGreaterThan(0));
    fireEvent.click(await screen.findByRole('button', { name: 'Trigger Firestore write' }));

    await waitFor(() =>
      expect(saveDocument).toHaveBeenCalledWith(
        'emu',
        'orders/ord_1024',
        { status: 'paid' },
        undefined,
      )
    );
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['firestore'] })
    );
  });

  it('creates a Firestore document and invalidates live Firestore queries', async () => {
    surfaceState.action = 'create';
    const repositories = createMockRepositories();
    const createDocument = vi.spyOn(repositories.firestore, 'createDocument');
    const { queryClient } = renderShell({ dataMode: 'live', repositories });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await waitFor(() => expect(screen.getAllByText('Local Emulator').length).toBeGreaterThan(0));
    fireEvent.click(await screen.findByRole('button', { name: 'Trigger Firestore write' }));

    await waitFor(() =>
      expect(createDocument).toHaveBeenCalledWith('emu', 'orders', 'ord_created', {
        status: 'new',
      })
    );
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['firestore'] })
    );
  });

  it('updates Firestore fields through patch writes and invalidates live Firestore queries', async () => {
    surfaceState.action = 'patch';
    const repositories = createMockRepositories();
    const updateDocumentFields = vi.spyOn(repositories.firestore, 'updateDocumentFields');
    const { queryClient } = renderShell({ dataMode: 'live', repositories });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await waitFor(() => expect(screen.getAllByText('Local Emulator').length).toBeGreaterThan(0));
    fireEvent.click(await screen.findByRole('button', { name: 'Trigger Firestore write' }));

    await waitFor(() =>
      expect(updateDocumentFields).toHaveBeenCalledWith(
        'emu',
        'orders/ord_1024',
        [{
          baseValue: 'draft',
          fieldPath: ['status'],
          type: 'set',
          value: 'paid',
        }],
        { staleBehavior: 'save-and-notify' },
      )
    );
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['firestore'] })
    );
  });
});
