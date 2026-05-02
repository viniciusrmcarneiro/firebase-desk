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
import { selectionActions } from '../stores/selectionStore.ts';
import { tabActions, tabsStore, type WorkspaceTabKind } from '../stores/tabsStore.ts';
import { type PersistedWorkspaceState } from '../workspacePersistence.ts';
import { useAppShellController } from './useAppShellController.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  tabActions.reset();
  selectionActions.reset();
});

describe('useAppShellController integration', () => {
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
