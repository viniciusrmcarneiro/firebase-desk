import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { AppearanceProvider } from '@firebase-desk/product-ui';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActivityState } from '../../app-core/activity/activityState.ts';
import { createInitialActivityState } from '../../app-core/activity/activityState.ts';
import { createActivityStore } from '../../app-core/activity/activityStore.ts';
import {
  createMockRepositories,
  RepositoryProvider,
  type RepositorySet,
} from '../RepositoryProvider.tsx';
import { selectionActions, selectionStore } from '../stores/selectionStore.ts';
import { tabActions, tabsStore, type WorkspaceTabKind } from '../stores/tabsStore.ts';
import { collectionNodeId } from '../workspaceModel.ts';
import { type PersistedWorkspaceState } from '../workspacePersistence.ts';
import { useAppShellController } from './useAppShellController.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  tabActions.reset();
  selectionActions.reset();
});

describe('useAppShellController', () => {
  it('changes theme through settings and records activity', async () => {
    const repositories = createMockRepositories();
    const appendActivity = vi.spyOn(repositories.activity, 'append');
    const { result } = renderController({ repositories });
    await waitForProjects(result);

    act(() => result.current.header.onModeChange('dark'));

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    await waitFor(() =>
      expect(appendActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'Change theme',
          area: 'settings',
          status: 'success',
        }),
      )
    );
  });

  it('exposes settings activity in the Activity drawer model', async () => {
    const { result } = renderController();
    await waitForProjects(result);

    act(() => result.current.header.onModeChange('dark'));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    act(() => result.current.workspace.onActivityToggle());

    await waitFor(() =>
      expect(
        result.current.workspace.activity.entries.some((entry) => entry.action === 'Change theme'),
      ).toBe(true)
    );
  });

  it('clears an activity issue indicator only after Activity opens', async () => {
    const { result } = renderController({ activityState: activityIssueState() });
    await waitForProjects(result);

    expect(result.current.workspace.activity.buttonBadge?.label).toBe('failure');

    act(() => result.current.header.onModeChange('dark'));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(result.current.workspace.activity.buttonBadge?.label).toBe('failure');

    act(() => result.current.workspace.onActivityToggle());

    await waitFor(() => expect(result.current.workspace.activity.buttonBadge).toBeNull());
  });

  it('records Firestore query activity', async () => {
    const repositories = createMockRepositories();
    const appendActivity = vi.spyOn(repositories.activity, 'append');
    const { result } = renderController({
      initialTabs: [{ kind: 'firestore-query', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);

    act(() => currentFirestore(result).onRunQuery());

    await waitFor(() =>
      expect(appendActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'Run query',
          area: 'firestore',
          status: 'success',
        }),
      )
    );
  });

  it('surfaces invalid saved workspace state as workspace activity', async () => {
    const repositories = createMockRepositories();
    const appendActivity = vi.spyOn(repositories.activity, 'append');
    const { result } = renderController({ repositories, savedWorkspaceRaw: '{' });

    await waitFor(() =>
      expect(appendActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'Load workspace state',
          area: 'workspace',
          status: 'failure',
        }),
      )
    );
    await waitFor(() =>
      expect(result.current.workspace.lastAction).toMatch(/Workspace persistence failed/)
    );
  });

  it('builds destructive close-tab state and confirms through tab cleanup', async () => {
    const { result } = renderController({
      initialTabs: [
        { kind: 'firestore-query', connectionId: 'emu' },
        { kind: 'js-query', connectionId: 'emu' },
      ],
    });
    await waitForProjects(result);
    const activeTabId = tabsStore.state.activeTabId;
    expect(activeTabId).toBeTruthy();

    act(() => result.current.workspace.onCloseTab(activeTabId));

    await waitFor(() => expect(result.current.dialogs.destructiveAction?.title).toBe('Close tab'));
    expect(result.current.dialogs.destructiveAction?.confirmLabel).toBe('Close');

    act(() => result.current.dialogs.destructiveAction?.onConfirm());

    expect(tabsStore.state.tabs.some((tab) => tab.id === activeTabId)).toBe(false);
  });

  it('cancels a running JS Query when closing its tab', async () => {
    const repositories = createMockRepositories();
    const run = vi.spyOn(repositories.scriptRunner, 'run').mockImplementation(
      () => new Promise(() => {}),
    );
    const cancel = vi.spyOn(repositories.scriptRunner, 'cancel');
    const { result } = renderController({
      initialTabs: [{ kind: 'js-query', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);

    act(() => currentScript(result).onRun());

    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    const runId = run.mock.calls[0]?.[0].runId;
    const activeTabId = tabsStore.state.activeTabId;
    act(() => result.current.workspace.onCloseTab(activeTabId));
    act(() => result.current.dialogs.destructiveAction?.onConfirm());

    await waitFor(() => expect(cancel).toHaveBeenCalledWith(runId));
  });

  it('keeps a busy Firestore query tab open when closing it', async () => {
    const repositories = createMockRepositories();
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery').mockImplementation(
      () => new Promise(() => {}),
    );
    const { result } = renderController({
      initialTabs: [{ kind: 'firestore-query', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);
    const activeTabId = tabsStore.state.activeTabId;

    act(() => currentFirestore(result).onRunQuery());
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    act(() => result.current.workspace.onCloseTab(activeTabId));
    act(() => result.current.dialogs.destructiveAction?.onConfirm());

    expect(tabsStore.state.tabs.some((tab) => tab.id === activeTabId)).toBe(true);
    expect(result.current.workspace.lastAction).toMatch(/Still loading/);
  });

  it('switches the active tab project and clears connection-scoped selection', async () => {
    const { result } = renderController({
      initialTabs: [{ kind: 'auth-users', connectionId: 'emu' }],
    });
    await waitForProjects(result);
    act(() => selectionActions.selectAuthUser('u_ada'));

    act(() => result.current.workspace.onConnectionChange('prod'));

    const activeTab = tabsStore.state.tabs.find((tab) => tab.id === tabsStore.state.activeTabId);
    expect(activeTab?.connectionId).toBe('prod');
    expect(selectionStore.state.authUserId).toBeNull();
    expect(result.current.workspace.lastAction).toBe('Changed tab account');
  });

  it('runs document path queries through getDocument', async () => {
    const repositories = createMockRepositories();
    const getDocument = vi.spyOn(repositories.firestore, 'getDocument');
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    const { result } = renderController({
      initialTabs: [{ kind: 'firestore-query', connectionId: 'emu', path: 'orders' }],
      repositories,
    });
    await waitForProjects(result);

    act(() =>
      currentFirestore(result).onDraftChange({
        ...currentFirestore(result).draft,
        path: 'orders/ord_1024',
      })
    );
    act(() => currentFirestore(result).onRunQuery());

    await waitFor(() => expect(getDocument).toHaveBeenCalledWith('emu', 'orders/ord_1024'));
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('uses repository search for auth filtering', async () => {
    const repositories = createMockRepositories();
    const searchUsers = vi.spyOn(repositories.auth, 'searchUsers');
    const { result } = renderController({
      initialTabs: [{ kind: 'auth-users', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);

    act(() => currentAuth(result).onFilterChange('grace'));

    await waitFor(() => expect(searchUsers).toHaveBeenCalledWith('emu', 'grace'));
  });

  it('loads auth users when an auth tab opens and records activity', async () => {
    const repositories = createMockRepositories();
    const appendActivity = vi.spyOn(repositories.activity, 'append');
    const { result } = renderController({
      initialTabs: [{ kind: 'auth-users', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);

    await waitFor(() => expect(currentAuth(result).users.length).toBeGreaterThan(0));
    await waitFor(() =>
      expect(appendActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'Load users',
          area: 'auth',
          status: 'success',
        }),
      )
    );
  });

  it('runs JS Query through the script runner repository', async () => {
    const repositories = createMockRepositories();
    const run = vi.spyOn(repositories.scriptRunner, 'run');
    const { result } = renderController({
      initialTabs: [{ kind: 'js-query', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);

    act(() => currentScript(result).onRun());

    await waitFor(() =>
      expect(run).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionId: 'emu',
          runId: expect.any(String),
          source: expect.any(String),
        }),
      )
    );
    await waitFor(() =>
      expect(
        (currentScript(result).result?.stream ?? []).some((item) =>
          item.label === 'yield DocumentSnapshot'
        ),
      ).toBe(true)
    );
  });

  it('starts the create-document flow from a collection tree node', async () => {
    const { result } = renderController();
    await waitForProjects(result);

    act(() => result.current.sidebar.onCreateDocument(collectionNodeId('emu', 'orders')));

    await waitFor(() =>
      expect(result.current.tabView?.firestore.createDocumentRequest).toMatchObject({
        collectionPath: 'orders',
      })
    );
    expect(result.current.workspace.lastAction).toBe('Creating document in orders');
  });

  it('keeps current Firestore results when editing the draft limit', async () => {
    const repositories = createMockRepositories();
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    const { result } = renderController({
      initialTabs: [{ kind: 'firestore-query', connectionId: 'emu', path: 'orders' }],
      repositories,
    });
    await waitForProjects(result);

    act(() => currentFirestore(result).onRunQuery());
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(currentFirestore(result).rows.length).toBeGreaterThan(0));
    const originalRows = currentFirestore(result).rows;

    act(() =>
      currentFirestore(result).onDraftChange({
        ...currentFirestore(result).draft,
        limit: 1,
      })
    );

    expect(currentFirestore(result).rows).toStrictEqual(originalRows);
    expect(runQuery).toHaveBeenCalledTimes(1);

    act(() => currentFirestore(result).onRunQuery());
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(2));
    expect(runQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ connectionId: 'emu', path: 'orders' }),
      expect.objectContaining({ limit: 1 }),
    );
  });

  it('restores user tab state without restoring query results', async () => {
    const repositories = createMockRepositories();
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    const tabId = 'tab-firestore-query-7';
    const { result } = renderController({
      repositories,
      savedWorkspace: firestoreWorkspace(tabId),
    });

    await waitFor(() => expect(currentFirestore(result).draft.path).toBe('customers'));
    expect(currentFirestore(result).draft.limit).toBe(7);
    expect(currentFirestore(result).rows).toHaveLength(0);
    expect(runQuery).not.toHaveBeenCalled();

    act(() => currentFirestore(result).onRunQuery());
    await waitFor(() =>
      expect(runQuery).toHaveBeenCalledWith(
        expect.objectContaining({ connectionId: 'emu', path: 'customers' }),
        expect.objectContaining({ limit: 7 }),
      )
    );
  });

  it('restores script tabs when saved interaction history mentions closed tabs', async () => {
    const repositories = createMockRepositories();
    const run = vi.spyOn(repositories.scriptRunner, 'run');
    const { result } = renderController({
      repositories,
      savedWorkspace: scriptWorkspace(),
    });

    await waitFor(() => expect(result.current.workspace.activeTab?.kind).toBe('js-query'));
    act(() => currentScript(result).onRun());

    await waitFor(() =>
      expect(run).toHaveBeenCalledWith(
        expect.objectContaining({ connectionId: 'emu', source: 'yield 1;' }),
      )
    );
    expect(result.current.workspace.lastAction).not.toMatch(/Workspace persistence failed/);
  });

  it('restores persisted workspace once in StrictMode', async () => {
    const tabId = 'tab-firestore-strict';
    const repositories = createMockRepositories();
    const restoreSpy = vi.spyOn(tabsStore, 'setState');
    const { result } = renderController({
      repositories,
      savedWorkspace: firestoreWorkspace(tabId),
      strictMode: true,
    });
    restoreSpy.mockClear();

    await waitFor(() => expect(currentFirestore(result).draft.path).toBe('customers'));
    expect(restoreSpy).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      const raw = JSON.stringify((await repositories.settings.load()).workspaceState);
      expect(raw).toContain('customers');
      expect(raw).toContain('"limit":7');
    });
  });

  it('persists user tab state without query results', async () => {
    const repositories = createMockRepositories();
    const runQuery = vi.spyOn(repositories.firestore, 'runQuery');
    const { result } = renderController({
      initialTabs: [{ kind: 'firestore-query', connectionId: 'emu', path: 'orders' }],
      repositories,
    });
    await waitForProjects(result);

    act(() => currentFirestore(result).onRunQuery());
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    act(() =>
      currentFirestore(result).onDraftChange({
        ...currentFirestore(result).draft,
        limit: 9,
        path: 'customers',
      })
    );

    await waitFor(async () => {
      const raw = JSON.stringify((await repositories.settings.load()).workspaceState);
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
    const { result } = renderController({ repositories });
    await waitForProjects(result);

    expect(result.current.workspace.activeTab).toBeUndefined();
    expect(listUsers).not.toHaveBeenCalled();
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('routes document saves through the Firestore repository', async () => {
    const repositories = createMockRepositories();
    const saveDocument = vi.spyOn(repositories.firestore, 'saveDocument');
    const { result } = renderController({
      dataMode: 'live',
      initialTabs: [{ kind: 'firestore-query', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);

    await act(async () => {
      await currentFirestore(result).onSaveDocument('orders/ord_1024', { status: 'paid' });
    });

    expect(saveDocument).toHaveBeenCalledWith(
      'emu',
      'orders/ord_1024',
      { status: 'paid' },
      undefined,
    );
  });

  it('routes document creates through the Firestore repository', async () => {
    const repositories = createMockRepositories();
    const createDocument = vi.spyOn(repositories.firestore, 'createDocument');
    const { result } = renderController({
      dataMode: 'live',
      initialTabs: [{ kind: 'firestore-query', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);

    await act(async () => {
      await currentFirestore(result).onCreateDocument('orders', 'ord_created', { status: 'new' });
    });

    expect(createDocument).toHaveBeenCalledWith('emu', 'orders', 'ord_created', {
      status: 'new',
    });
  });

  it('routes field patches through the Firestore repository', async () => {
    const repositories = createMockRepositories();
    const updateDocumentFields = vi.spyOn(repositories.firestore, 'updateDocumentFields');
    const { result } = renderController({
      dataMode: 'live',
      initialTabs: [{ kind: 'firestore-query', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);
    const operations = [{
      baseValue: 'draft',
      fieldPath: ['status'],
      type: 'set' as const,
      value: 'paid',
    }];

    await act(async () => {
      await currentFirestore(result).onUpdateDocumentFields(
        'orders/ord_1024',
        operations,
        { staleBehavior: 'save-and-notify' },
      );
    });

    expect(updateDocumentFields).toHaveBeenCalledWith(
      'emu',
      'orders/ord_1024',
      operations,
      { staleBehavior: 'save-and-notify' },
    );
  });

  it('routes deletes with selected subcollections and clears selected document', async () => {
    const repositories = createMockRepositories();
    const deleteDocument = vi.spyOn(repositories.firestore, 'deleteDocument');
    const { result } = renderController({
      dataMode: 'live',
      initialTabs: [{ kind: 'firestore-query', connectionId: 'emu' }],
      repositories,
    });
    await waitForProjects(result);
    act(() => selectionActions.selectDocument('orders/ord_1024'));

    await act(async () => {
      await currentFirestore(result).onDeleteDocument('orders/ord_1024', {
        deleteDescendantDocumentPaths: ['orders/ord_1024/events/event_1'],
        deleteSubcollectionPaths: ['orders/ord_1024/events'],
      });
    });

    expect(deleteDocument).toHaveBeenCalledWith('emu', 'orders/ord_1024', {
      deleteSubcollectionPaths: ['orders/ord_1024/events'],
    });
    expect(deleteDocument).toHaveBeenCalledTimes(1);
    expect(selectionStore.state.firestoreDocumentPath).toBeNull();
  });
});

function renderController(
  {
    activityState,
    dataMode = 'mock',
    initialTabs = [],
    repositories = createMockRepositories(),
    savedWorkspace,
    savedWorkspaceRaw,
    strictMode = false,
  }: {
    readonly activityState?: ActivityState | undefined;
    readonly dataMode?: 'live' | 'mock';
    readonly initialTabs?: ReadonlyArray<{
      readonly connectionId: string;
      readonly kind: WorkspaceTabKind;
      readonly path?: string;
    }>;
    readonly repositories?: RepositorySet;
    readonly savedWorkspace?: PersistedWorkspaceState;
    readonly savedWorkspaceRaw?: unknown;
    readonly strictMode?: boolean;
  } = {},
) {
  if (savedWorkspaceRaw !== undefined) {
    void repositories.settings.save({ workspaceState: savedWorkspaceRaw });
  }
  if (savedWorkspace) {
    void repositories.settings.save({ workspaceState: savedWorkspace });
  }
  tabActions.reset();
  selectionActions.reset();
  for (const tab of initialTabs) tabActions.openTab(tab);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  const activityStore = activityState ? createActivityStore(activityState) : undefined;
  return renderHook(() => useAppShellController({ activityStore, dataMode }), {
    wrapper: ({ children }: { readonly children: ReactNode; }) => (
      <MaybeStrictMode strictMode={strictMode}>
        <RepositoryProvider repositories={repositories}>
          <HotkeysProvider settings={repositories.settings}>
            <AppearanceProvider settings={repositories.settings}>
              {children}
            </AppearanceProvider>
          </HotkeysProvider>
        </RepositoryProvider>
      </MaybeStrictMode>
    ),
  });
}

function MaybeStrictMode(
  { children, strictMode }: { readonly children: ReactNode; readonly strictMode: boolean; },
) {
  return strictMode ? <StrictMode>{children}</StrictMode> : <>{children}</>;
}

async function waitForProjects(
  result: ReturnType<typeof renderController>['result'],
) {
  await waitFor(() => expect(result.current.workspace.projects.length).toBeGreaterThan(0));
}

function currentFirestore(
  result: ReturnType<typeof renderController>['result'],
) {
  const tabView = result.current.tabView;
  if (!tabView) throw new Error('Expected an active tab view.');
  return tabView.firestore;
}

function currentAuth(
  result: ReturnType<typeof renderController>['result'],
) {
  const tabView = result.current.tabView;
  if (!tabView) throw new Error('Expected an active tab view.');
  return tabView.auth;
}

function currentScript(
  result: ReturnType<typeof renderController>['result'],
) {
  const tabView = result.current.tabView;
  if (!tabView) throw new Error('Expected an active tab view.');
  return tabView.script;
}

function activityIssueState(): ActivityState {
  return createInitialActivityState({
    unreadIssue: {
      action: 'Run query',
      area: 'firestore',
      id: 'activity-test-issue',
      status: 'failure',
      summary: 'Failed to load orders',
      timestamp: '2026-04-29T00:00:00.000Z',
    },
  });
}

function firestoreWorkspace(tabId: string): PersistedWorkspaceState {
  return {
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
        connectionId: 'emu',
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
}

function scriptWorkspace(): PersistedWorkspaceState {
  return {
    version: 1,
    authFilter: '',
    scripts: { 'tab-js-9': 'yield 1;' },
    tabsState: {
      activeTabId: 'tab-js-9',
      interactionHistory: [
        {
          activeTabId: 'tab-firestore-8',
          path: 'orders',
          selectedTreeItemId: 'collection:emu:orders',
        },
        {
          activeTabId: 'closed-tab',
          path: 'closed',
          selectedTreeItemId: 'collection:emu:closed',
        },
      ],
      interactionHistoryIndex: 1,
      tabs: [
        {
          id: 'tab-firestore-8',
          kind: 'firestore-query',
          title: 'orders',
          connectionId: 'emu',
          history: ['orders'],
          historyIndex: 0,
          inspectorWidth: 360,
        },
        {
          id: 'tab-js-9',
          kind: 'js-query',
          title: 'JS Query',
          connectionId: 'emu',
          history: ['scripts/default'],
          historyIndex: 0,
          inspectorWidth: 360,
        },
      ],
    },
    drafts: {},
  };
}
