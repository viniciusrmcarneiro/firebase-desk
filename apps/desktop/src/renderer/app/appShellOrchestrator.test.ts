import type { ActivityLogEntry, FirestoreQueryDraft } from '@firebase-desk/repo-contracts';
import { createProjectFixture } from '@firebase-desk/repo-mocks';
import { describe, expect, it, vi } from 'vitest';
import { closeWorkspaceTabsCommand } from '../app-core/workspace/workspaceCommands.ts';
import { createInitialTabsState } from '../app-core/workspace/workspaceState.ts';
import {
  type AppShellOrchestratorInput,
  createAppShellController,
} from './appShellOrchestrator.ts';
import { createMockRepositories } from './RepositoryProvider.tsx';
import type { WorkspaceTab } from './stores/tabsStore.ts';
import {
  authNodeId,
  collectionNodeId,
  DEFAULT_FIRESTORE_DRAFT,
  firestoreNodeId,
} from './workspaceModel.ts';

describe('createAppShellController', () => {
  it('requests close confirmation and cleans tab runtime after confirm', () => {
    const tab = firestoreTab();
    const closeWorkspaceTabs = vi.fn((state, commandInput) => ({
      lastAction: commandInput.successLabel,
      state: { ...state, activeTabId: '', tabs: [] },
      tabsToCleanup: commandInput.tabsToClose,
    }));
    const { input, mocks } = createInput({
      activeTab: tab,
      closeWorkspaceTabs,
      tabsState: tabsState([tab], tab.id),
    });
    const controller = createAppShellController(input);

    controller.workspace.onCloseTab(tab.id);

    const action = expectSingleDestructiveAction(mocks.ui.requestDestructiveAction);
    expect(action.title).toBe('Close tab');
    expect(action.confirmLabel).toBe('Close');

    action.onConfirm();

    expect(closeWorkspaceTabs).toHaveBeenCalledWith(input.tabsState, {
      busyTabIds: new Set(),
      successLabel: 'Closed orders',
      tabsToClose: [tab],
    });
    expect(mocks.firestoreTab.clearTab).toHaveBeenCalledWith(tab.id);
    expect(mocks.jsTab.clearTab).toHaveBeenCalledWith(tab.id);
    expect(mocks.ui.setTabsState).toHaveBeenCalledWith({
      ...input.tabsState,
      activeTabId: '',
      tabs: [],
    });
    expect(mocks.ui.setLastAction).toHaveBeenCalledWith('Closed orders');
  });

  it('starts document creation from a collection tree item', () => {
    const { input, mocks } = createInput();
    const controller = createAppShellController(input);

    controller.sidebar.onCreateDocument(collectionNodeId('emu', 'orders'));

    expect(mocks.firestoreTab.openTab).toHaveBeenCalledWith('emu', 'orders');
    expect(mocks.firestoreWrite.requestCreateDocument).toHaveBeenCalledWith({
      collectionPath: 'orders',
      requestId: 1,
      tabId: 'tab-opened',
    });
    expect(mocks.ui.recordInteraction).toHaveBeenCalledWith({
      activeTabId: 'tab-opened',
      path: 'orders',
      selectedTreeItemId: collectionNodeId('emu', 'orders'),
    });
    expect(mocks.ui.setLastAction).toHaveBeenCalledWith('Creating document in orders');
  });

  it('starts editable collection creation from the Firestore tree root', () => {
    const { input, mocks } = createInput();
    const controller = createAppShellController(input);

    controller.sidebar.onCreateCollection(firestoreNodeId('emu'));

    expect(mocks.firestoreTab.openTab).toHaveBeenCalledWith('emu', DEFAULT_FIRESTORE_DRAFT.path);
    expect(mocks.firestoreWrite.requestCreateDocument).toHaveBeenCalledWith({
      collectionPath: '',
      collectionPathEditable: true,
      requestId: 1,
      tabId: 'tab-opened',
    });
    expect(mocks.ui.setLastAction).toHaveBeenCalledWith('Creating collection');
  });

  it('changes active tab connection and clears connection-scoped state', () => {
    const tab = authTab();
    const { input, mocks } = createInput({
      activeTab: tab,
      tabsState: tabsState([tab], tab.id),
    });
    const controller = createAppShellController(input);

    controller.workspace.onConnectionChange('prod');

    expect(mocks.ui.updateActiveTabConnection).toHaveBeenCalledWith(tab.id, 'prod');
    expect(mocks.firestoreTab.clearTab).toHaveBeenCalledWith(tab.id);
    expect(mocks.jsTab.clearTab).toHaveBeenCalledWith(tab.id);
    expect(mocks.ui.clearAuthSelection).toHaveBeenCalledTimes(1);
    expect(mocks.authTab.clear).toHaveBeenCalledTimes(1);
    expect(mocks.ui.selectTreeItem).toHaveBeenCalledWith(authNodeId('prod'));
    expect(mocks.ui.setLastAction).toHaveBeenCalledWith('Changed tab account');
  });

  it('opens Firestore targets from Activity', () => {
    const entry = activityEntry();
    const { input, mocks } = createInput({
      activity: {
        openTargetIntent: vi.fn(() => ({
          connectionId: 'emu',
          path: 'orders/ord_1024',
          type: 'firestore' as const,
        })),
      },
    });
    const controller = createAppShellController(input);

    controller.workspace.onActivityOpenTarget(entry);

    expect(mocks.firestoreTab.openTab).toHaveBeenCalledWith('emu', 'orders/ord_1024');
    expect(mocks.ui.recordInteraction).toHaveBeenCalledWith({
      activeTabId: 'tab-opened',
      path: 'orders/ord_1024',
      selectedTreeItemId: input.selection.treeItemId,
    });
    expect(mocks.ui.setLastAction).toHaveBeenCalledWith('Opened orders/ord_1024');
  });

  it('opens Auth targets from Activity', () => {
    const entry = activityEntry();
    const { input, mocks } = createInput({
      activity: {
        openTargetIntent: vi.fn(() => ({
          connectionId: 'emu',
          type: 'auth' as const,
          uid: 'u_ada',
        })),
      },
    });
    const controller = createAppShellController(input);

    controller.workspace.onActivityOpenTarget(entry);

    expect(mocks.tabs.openOrSelectTab).toHaveBeenCalledWith({
      connectionId: 'emu',
      kind: 'auth-users',
    });
    expect(mocks.ui.selectAuthUser).toHaveBeenCalledWith('u_ada');
    expect(mocks.ui.setLastAction).toHaveBeenCalledWith('Opened u_ada');
  });

  it('exposes hotkey handlers without React wiring', () => {
    const { input, mocks } = createInput({ activeProject: null, activeTab: undefined });
    const controller = createAppShellController(input);

    controller.hotkeys.onNewTab();

    expect(mocks.ui.setLastAction).toHaveBeenCalledWith('Choose a connection item first');
  });

  it('scopes results changed state to the active Firestore tab', () => {
    const tab = firestoreTab({ id: 'tab-firestore-1' });
    const { input, mocks } = createInput({
      activeTab: tab,
      tabsState: tabsState([tab], tab.id),
    });
    const controller = createAppShellController(input);

    controller.tabView?.firestore.onResultsStaleChange(true);

    expect(mocks.firestoreTab.setResultsStale).toHaveBeenCalledWith(tab.id, true);

    controller.tabView?.firestore.onResultsStaleChange(false, 'tab-firestore-2');

    expect(mocks.firestoreTab.setResultsStale).toHaveBeenLastCalledWith(
      'tab-firestore-2',
      false,
    );
  });
});

function createInput(
  overrides: Omit<Partial<AppShellOrchestratorInput>, 'activity'> & {
    readonly activity?: Partial<AppShellOrchestratorInput['activity']>;
  } = {},
) {
  const repositories = createMockRepositories();
  const project = createProjectFixture({ id: 'emu', name: 'Local Emulator' });
  const prod = createProjectFixture({ id: 'prod', name: 'Production', target: 'production' });
  const tab = overrides.activeTab ?? firestoreTab();
  const state = overrides.tabsState ?? tabsState(tab ? [tab] : [], tab?.id ?? '');
  const activity = {
    button: { badge: null, variant: 'ghost' as const },
    clear: vi.fn(),
    close: vi.fn(),
    drawer: {
      area: 'all' as const,
      entries: [],
      expanded: false,
      isLoading: false,
      open: false,
      search: '',
      status: 'all' as const,
    },
    exportEntries: vi.fn(),
    openTargetIntent: vi.fn(() => null),
    setArea: vi.fn(),
    setExpanded: vi.fn(),
    setSearch: vi.fn(),
    setStatus: vi.fn(),
    toggle: vi.fn(),
    ...overrides.activity,
  };
  const authTabFacade = {
    authFilter: '',
    clear: vi.fn(),
    errorMessage: null,
    isTabLoading: vi.fn(() => false),
    loadMore: vi.fn(),
    refetch: vi.fn(),
    saveCustomClaims: vi.fn(),
    selectedUser: null,
    setAuthFilter: vi.fn(),
    users: [],
    usersHasMore: false,
    usersIsFetchingMore: false,
    usersIsLoading: false,
  };
  const firestoreTabFacade = {
    activeDraft: draft('orders'),
    clearTab: vi.fn(),
    drafts: {},
    errorMessage: null,
    hasMore: false,
    isFetchingMore: false,
    isLoading: false,
    isTabLoading: vi.fn(() => false),
    loadMore: vi.fn(),
    openTab: vi.fn(() => 'tab-opened'),
    openTabInNewTab: vi.fn(() => 'tab-opened-new'),
    queryRows: [],
    refreshQuery: vi.fn(() => 'orders'),
    resetDraft: vi.fn(),
    resultsStale: false,
    runQuery: vi.fn(() => 'orders'),
    selectDocument: vi.fn(),
    selectedDocument: null,
    selectedDocumentPath: null,
    setDraft: vi.fn(),
    setResultsStale: vi.fn(),
  };
  const firestoreWriteFacade = {
    createDocument: vi.fn(),
    createDocumentRequest: null,
    deleteDocument: vi.fn(),
    generateDocumentId: vi.fn(),
    handleCreateDocumentRequestHandled: vi.fn(),
    requestCreateDocument: vi.fn(),
    saveDocument: vi.fn(),
    updateDocumentFields: vi.fn(),
  };
  const jsTabFacade = {
    cancelScript: vi.fn(() => true),
    clearTab: vi.fn(),
    isRunning: false,
    isTabRunning: vi.fn(() => false),
    runScript: vi.fn(() => true),
    scriptResult: undefined,
    scriptRunId: null,
    scriptSource: 'yield 1;',
    scriptStartedAt: null,
    setScriptSource: vi.fn(),
  };
  const tabsFacade = {
    goBackInteraction: vi.fn(() => null),
    goForwardInteraction: vi.fn(() => null),
    openOrSelectTab: vi.fn(() => 'tab-tool'),
    openTab: vi.fn(() => 'tab-new'),
    reorderTabs: vi.fn(),
    selectTab: vi.fn(),
    sortByProject: vi.fn(),
  };
  const treeFacade = {
    filter: '',
    handleOpenItem: vi.fn(),
    handleRefreshItem: vi.fn(),
    handleSelectItem: vi.fn(),
    handleToggleItem: vi.fn(),
    items: [],
    refreshLoadedRoots: vi.fn(),
    setFilter: vi.fn(),
  };
  const ui = {
    clearAuthSelection: vi.fn(),
    recordInteraction: vi.fn(),
    requestDestructiveAction: vi.fn(),
    restorePath: vi.fn(),
    selectAuthUser: vi.fn(),
    selectTreeItem: vi.fn(),
    setAddProjectOpen: vi.fn(),
    setCredentialWarning: vi.fn(),
    setDensity: vi.fn(),
    setEditingProjectId: vi.fn(),
    setLastAction: vi.fn(),
    setSidebarCollapsed: vi.fn(),
    setTabsState: vi.fn(),
    updateActiveTabConnection: vi.fn(),
  };
  const input: AppShellOrchestratorInput = {
    activeProject: overrides.activeProject === undefined ? project : overrides.activeProject,
    activeTab: tab,
    addProjectOpen: false,
    appearance: { mode: 'system', resolvedTheme: 'dark' },
    authTab: authTabFacade,
    canOpenDataDirectory: true,
    closeWorkspaceTabs: closeWorkspaceTabsCommand,
    credentialWarning: null,
    dataMode: 'mock',
    density: 'compact',
    destructiveAction: {
      pendingAction: null,
      setOpen: vi.fn(),
    },
    editingProject: null,
    firestoreTab: firestoreTabFacade,
    firestoreWrite: firestoreWriteFacade,
    focusAuthFilter: vi.fn(),
    focusTreeFilter: vi.fn(),
    jsTab: jsTabFacade,
    lastAction: 'Ready',
    layout: {
      sidebarCollapsed: false,
      sidebarDefaultWidth: 320,
      onSidebarResize: vi.fn(),
    },
    nextCreateDocumentRequestId: vi.fn(() => 1),
    projects: [project, prod],
    projectsRepository: repositories.projects,
    projectCommands: {
      addProject: vi.fn(),
      removeProject: vi.fn(),
      updateProject: vi.fn(),
    },
    repositories: {
      firestore: {
        listSubcollections: vi.fn(),
      },
      settings: repositories.settings,
    },
    selection: {
      authUserId: null,
      firestoreDocumentPath: null,
      treeItemId: collectionNodeId('emu', 'orders'),
    },
    settings: {
      changeTheme: vi.fn(),
      dataDirectoryPath: null,
      open: false,
      openDataDirectory: vi.fn(),
      openSettings: vi.fn(),
      recordSettingsSaved: vi.fn(),
      setOpen: vi.fn(),
    },
    sidebarCollapsed: false,
    tabs: tabsFacade,
    tabsState: state,
    ...overrides,
    activity,
    tree: treeFacade,
    ui,
  };
  return {
    input,
    mocks: {
      authTab: authTabFacade,
      firestoreTab: firestoreTabFacade,
      firestoreWrite: firestoreWriteFacade,
      jsTab: jsTabFacade,
      tabs: tabsFacade,
      ui,
    },
  };
}

function expectSingleDestructiveAction(
  request: ReturnType<typeof vi.fn>,
): NonNullable<AppShellOrchestratorInput['destructiveAction']['pendingAction']> {
  expect(request).toHaveBeenCalledTimes(1);
  return request.mock.calls[0]![0];
}

function tabsState(tabs: ReadonlyArray<WorkspaceTab>, activeTabId: string) {
  return {
    ...createInitialTabsState('emu'),
    activeTabId,
    tabs,
  };
}

function firestoreTab(patch: Partial<WorkspaceTab> = {}): WorkspaceTab {
  return {
    connectionId: 'emu',
    history: ['orders'],
    historyIndex: 0,
    id: 'tab-firestore',
    inspectorWidth: 360,
    kind: 'firestore-query',
    title: 'orders',
    ...patch,
  };
}

function authTab(): WorkspaceTab {
  return {
    connectionId: 'emu',
    history: [],
    historyIndex: 0,
    id: 'tab-auth',
    inspectorWidth: 360,
    kind: 'auth-users',
    title: 'Authentication',
  };
}

function draft(path: string): FirestoreQueryDraft {
  return {
    ...DEFAULT_FIRESTORE_DRAFT,
    path,
  };
}

function activityEntry(): ActivityLogEntry {
  return {
    action: 'Open target',
    area: 'firestore',
    durationMs: 1,
    id: 'act-1',
    metadata: {},
    status: 'success',
    summary: 'Opened target',
    target: { path: 'orders/ord_1024', type: 'firestore-document' },
    timestamp: '2026-05-03T00:00:00.000Z',
  };
}
