import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { AppearanceProvider } from '@firebase-desk/product-ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell.tsx';
import { createAppQueryClient } from './queryClient.ts';
import {
  createMockRepositories,
  RepositoryProvider,
  type RepositorySet,
} from './RepositoryProvider.tsx';
import { selectionActions } from './stores/selectionStore.ts';
import { tabActions } from './stores/tabsStore.ts';
import {
  type PersistedWorkspaceState,
  WORKSPACE_STATE_STORAGE_KEY,
} from './workspacePersistence.ts';

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
      aria-label='Code editor'
      value={value}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

type InitialTab = Parameters<typeof tabActions.openTab>[0];

function renderShell(
  {
    initialTab,
    repositories = createMockRepositories(),
    savedWorkspace,
  }: {
    readonly initialTab?: InitialTab;
    readonly repositories?: RepositorySet;
    readonly savedWorkspace?: PersistedWorkspaceState;
  } = {},
) {
  window.localStorage.clear();
  if (savedWorkspace) {
    window.localStorage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify(savedWorkspace));
  }
  tabActions.reset();
  selectionActions.reset();
  if (initialTab) tabActions.openTab(initialTab);
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
            <AppShell />
          </AppearanceProvider>
        </HotkeysProvider>
      </QueryClientProvider>
    </RepositoryProvider>,
  );
}

describe('desktop AppShell', () => {
  it('flips html data-theme from the theme toggle', async () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  });

  it('shows real add account fields for service accounts and emulator profiles', async () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));

    expect(screen.getByRole('dialog', { name: 'Add Firebase Account' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Service account' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Local emulator' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Display name' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Service account JSON' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select JSON' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeTruthy();
  });

  it('shows the active project name, id, and target in the status bar', async () => {
    renderShell({ initialTab: { kind: 'auth-users', projectId: 'emu' } });

    expect((await screen.findAllByText('Local Emulator')).length).toBeGreaterThan(0);
    expect(screen.getByText('demo-local')).toBeTruthy();
    expect(screen.getAllByText('emulator').length).toBeGreaterThan(0);
  });

  it('confirms before closing a tab', async () => {
    renderShell({ initialTab: { kind: 'auth-users', projectId: 'emu' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Close Auth' }));
    expect(screen.getByRole('dialog', { name: 'Close tab' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Close tab' })).toBeNull());
  });

  it('runs document path queries through getDocument', async () => {
    const repositories = createMockRepositories();
    const getDocument = vi.spyOn(repositories.firestore, 'getDocument');
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    renderShell({
      repositories,
      initialTab: { kind: 'firestore-query', projectId: 'emu', path: 'orders' },
    });

    fireEvent.change(await screen.findByRole('textbox', { name: 'Query path' }), {
      target: { value: 'orders/ord_1024' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    await waitFor(() => expect(getDocument).toHaveBeenCalledWith('demo-local', 'orders/ord_1024'));
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('uses repository search for auth filtering', async () => {
    const repositories = createMockRepositories();
    const searchUsers = vi.spyOn(repositories.auth, 'searchUsers');
    renderShell({ repositories, initialTab: { kind: 'auth-users', projectId: 'emu' } });

    fireEvent.change(await screen.findByRole('textbox', { name: 'Filter users' }), {
      target: { value: 'grace' },
    });

    await waitFor(() => expect(searchUsers).toHaveBeenCalledWith('demo-local', 'grace'));
  });

  it('runs JS Query through the script runner repository', async () => {
    const repositories = createMockRepositories();
    const run = vi.spyOn(repositories.scriptRunner, 'run');
    renderShell({
      repositories,
      initialTab: { kind: 'js-query', projectId: 'emu' },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Run' }));

    await waitFor(() =>
      expect(run).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'demo-local', source: expect.any(String) }),
      )
    );
    expect(await screen.findByText('yield DocumentSnapshot')).toBeTruthy();
  });

  it('opens settings with settings-backed details', async () => {
    renderShell();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeTruthy();
    expect(await screen.findByText('Credential storage')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });

  it('shows and opens the desktop data location from settings', async () => {
    const openDataDirectory = vi.fn(async () => {});
    vi.stubGlobal('firebaseDesk', {
      app: {
        getConfig: vi.fn(async () => ({
          dataDirectory: '/Users/vini/Library/Application Support/@firebase-desk/desktop',
          dataMode: 'mock',
        })),
        openDataDirectory,
      },
    });
    renderShell();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(
      await screen.findByText('/Users/vini/Library/Application Support/@firebase-desk/desktop'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Open location' }));

    await waitFor(() => expect(openDataDirectory).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Opened data location')).toBeTruthy());
  });

  it('clears firestore results when changing the tab account', async () => {
    const repositories = createMockRepositories();
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    renderShell({
      repositories,
      initialTab: { kind: 'firestore-query', projectId: 'emu', path: 'orders' },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Run' }));
    await waitFor(() =>
      expect(runQuery).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'demo-local', path: 'orders' }),
        expect.anything(),
      )
    );

    const accountButton = await screen.findByRole('button', { name: 'Select account' });
    fireEvent.mouseDown(accountButton);
    fireEvent.keyDown(accountButton, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Acme Prod/ }));

    await waitFor(() => expect(screen.getAllByText('0 docs').length).toBeGreaterThan(0));
    expect(runQuery).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() =>
      expect(runQuery).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'acme-prod', path: 'orders' }),
        expect.anything(),
      )
    );
  });

  it('does not carry selected document preview between firestore tabs', async () => {
    const repositories = createMockRepositories();
    const getDocument = vi.spyOn(repositories.firestore, 'getDocument');
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    renderShell({
      repositories,
      initialTab: { kind: 'firestore-query', projectId: 'emu', path: 'orders' },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Run' }));
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));

    act(() => {
      selectionActions.selectDocument('orders/ord_1024');
      tabActions.openTab({ kind: 'firestore-query', projectId: 'emu', path: 'customers' });
    });

    await waitFor(() => expect(screen.getAllByText('0 docs').length).toBeGreaterThan(0));
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(getDocument).not.toHaveBeenCalled();
    expect(screen.getByText('No document selected')).toBeTruthy();
    expect(screen.queryByText('orders/ord_1024')).toBeNull();
  });

  it('keeps current firestore results when editing the draft limit', async () => {
    const repositories = createMockRepositories();
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    renderShell({
      repositories,
      initialTab: { kind: 'firestore-query', projectId: 'emu', path: 'orders' },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Run' }));
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getAllByText('25 docs').length).toBeGreaterThan(0));

    const limitInput = screen.getByRole('spinbutton', { name: 'Result limit' }) as HTMLInputElement;
    fireEvent.change(limitInput, { target: { value: '1' } });
    await waitFor(() => expect(limitInput.value).toBe('1'));
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('25 docs').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(2));
    expect(runQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectId: 'demo-local', path: 'orders' }),
      expect.objectContaining({ limit: 1 }),
    );
  });

  it('restores user tab state without restoring query results', async () => {
    const repositories = createMockRepositories();
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    const tabId = 'tab-firestore-query-7';
    const savedWorkspace: PersistedWorkspaceState = {
      version: 1,
      authFilter: '',
      scripts: {},
      tabsState: {
        activeTabId: tabId,
        interactionHistory: [{
          activeTabId: tabId,
          path: 'customers',
          selectedTreeItemId: 'collection:emu:customers',
        }],
        interactionHistoryIndex: 0,
        tabs: [{
          id: tabId,
          kind: 'firestore-query',
          title: 'customers',
          projectId: 'emu',
          history: ['customers'],
          historyIndex: 0,
          inspectorWidth: 360,
        }],
      },
      drafts: {
        [tabId]: {
          path: 'customers',
          filters: [{ id: 'filter-1', field: 'plan', op: '==', value: '"team"' }],
          filterField: 'plan',
          filterOp: '==',
          filterValue: '"team"',
          sortField: 'lastSeenAt',
          sortDirection: 'desc',
          limit: 7,
        },
      },
    };
    renderShell({ repositories, savedWorkspace });

    const pathInput = await screen.findByRole('textbox', { name: 'Query path' });
    const limitInput = screen.getByRole('spinbutton', { name: 'Result limit' }) as HTMLInputElement;

    expect((pathInput as HTMLInputElement).value).toBe('customers');
    expect(limitInput.value).toBe('7');
    expect(screen.getAllByText('0 docs').length).toBeGreaterThan(0);
    expect(runQuery).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() =>
      expect(runQuery).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'demo-local', path: 'customers' }),
        expect.objectContaining({ limit: 7 }),
      )
    );
  });

  it('persists user tab state without query results', async () => {
    const repositories = createMockRepositories();
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    renderShell({
      repositories,
      initialTab: { kind: 'firestore-query', projectId: 'emu', path: 'orders' },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Run' }));
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByRole('textbox', { name: 'Query path' }), {
      target: { value: 'customers' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Result limit' }), {
      target: { value: '9' },
    });

    await waitFor(() => {
      const raw = window.localStorage.getItem(WORKSPACE_STATE_STORAGE_KEY);
      expect(raw).toContain('customers');
      expect(raw).toContain('"limit":9');
      expect(raw).not.toContain('queryRows');
      expect(raw).not.toContain('queryRequests');
      expect(raw).not.toContain('scriptResults');
      expect(raw).not.toContain('ord_1024');
    });
  });

  it('does not request account data without an explicit account tab', async () => {
    const repositories = createMockRepositories();
    const listUsers = vi.spyOn(repositories.auth, 'listUsers');
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    renderShell({ repositories });

    expect((await screen.findAllByText('No tab')).length).toBeGreaterThan(0);
    expect(listUsers).not.toHaveBeenCalled();
    expect(runQuery).not.toHaveBeenCalled();
  });
});
