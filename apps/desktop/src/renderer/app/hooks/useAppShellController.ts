import type { DensityName } from '@firebase-desk/design-tokens';
import {
  type CommandPaletteItem,
  useAppearance,
  type WorkspaceTabModel,
} from '@firebase-desk/product-ui';
import type {
  ActivityLogEntry,
  FirestoreCollectionNode,
  ProjectAddInput,
  ProjectSummary,
  ProjectUpdatePatch,
} from '@firebase-desk/repo-contracts';
import { useSelector } from '@tanstack/react-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityStore } from '../../app-core/activity/activityStore.ts';
import { useActivityController } from '../../app-core/activity/useActivityController.ts';
import { useFirestoreWriteController } from '../../app-core/firestore/write/useFirestoreWriteController.ts';
import { useSettingsController } from '../../app-core/settings/useSettingsController.ts';
import { closeWorkspaceTabsCommand } from '../../app-core/workspace/workspaceCommands.ts';
import { type RepositorySet, useRepositories } from '../RepositoryProvider.tsx';
import { selectionActions, selectionStore } from '../stores/selectionStore.ts';
import {
  activePath,
  tabActions,
  tabsStore,
  type WorkspaceTab,
  type WorkspaceTabKind,
} from '../stores/tabsStore.ts';
import {
  clampSidebarWidth,
  DEFAULT_FIRESTORE_DRAFT,
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  parseTreeId,
  resolveProject,
  treeItemIdForTab,
} from '../workspaceModel.ts';
import type { WorkspacePersistenceFailure } from '../workspacePersistence.ts';
import type { WorkspaceTabViewProps } from '../WorkspaceTabView.tsx';
import { useAppCommandPaletteController } from './useAppCommandPaletteController.ts';
import { useAuthTabState } from './useAuthTabState.ts';
import {
  type DestructiveAction,
  useDestructiveActionController,
} from './useDestructiveActionController.ts';
import { useDocumentDensity } from './useDocumentDensity.ts';
import { useFirestoreTabState } from './useFirestoreTabState.ts';
import { useJsTabState } from './useJsTabState.ts';
import {
  usePersistedWorkspaceState,
  usePersistWorkspaceSnapshot,
} from './usePersistedWorkspaceState.ts';
import { useProjectCommandController } from './useProjectCommandController.ts';
import { useProjects } from './useProjects.ts';
import { useWorkspaceTree } from './useWorkspaceTree.ts';

export interface UseAppShellControllerInput {
  readonly activityStore?: ActivityStore | undefined;
  readonly dataMode?: 'live' | 'mock';
  readonly initialSidebarWidth?: number;
}

export function useAppShellController(
  {
    activityStore,
    dataMode = 'mock',
    initialSidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  }: UseAppShellControllerInput = {},
) {
  const appearance = useAppearance();
  const repositories = useRepositories();
  const tabsState = useSelector(tabsStore, (state) => state);
  const selection = useSelector(selectionStore, (state) => state);
  const projectsQuery = useProjects();
  const projects = projectsQuery.data ?? [];
  const activeTab = tabsState.tabs.find((tab) => tab.id === tabsState.activeTabId)
    ?? tabsState.tabs[0];
  const activeProject = activeTab ? resolveProject(projects, activeTab.connectionId) : null;

  const [density, setDensity] = useState<DensityName>('compact');
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [credentialWarning, setCredentialWarning] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState('Ready');
  const [workspacePersistenceError, setWorkspacePersistenceError] = useState<
    WorkspacePersistenceFailure | null
  >(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const destructiveAction = useDestructiveActionController();
  const nextCreateDocumentRequestId = useRef(1);
  const activity = useActivityController({
    loadIssuePreviewOnMount: !activityStore,
    onStatus: setLastAction,
    repository: repositories.activity,
    store: activityStore,
  });
  const recordActivity = activity.record;
  const persistedWorkspace = usePersistedWorkspaceState({
    onError: setWorkspacePersistenceError,
    settings: repositories.settings,
  });
  const settings = useSettingsController({
    dataDirectoryApi: getDesktopAppApi(),
    onStatus: setLastAction,
    recordActivity,
    setAppearanceMode: appearance.setMode,
  });
  const firestoreTab = useFirestoreTabState({
    activeProject,
    activeTab,
    initialDrafts: persistedWorkspace.snapshot?.drafts,
    onQueryActivity: recordActivity,
    selectedTreeItemId: selection.treeItemId,
  });
  const workspaceTree = useWorkspaceTree({
    activeTab,
    openFirestoreTab,
    openFirestoreTabInNewTab,
    openJsTabInNewTab,
    openToolTab,
    projects,
    selectedTreeItemId: selection.treeItemId,
    setLastAction,
  });
  const firestoreWrite = useFirestoreWriteController({
    activeProject,
    activeTab,
    clearSelectedDocument: (tabId) => firestoreTab.selectDocument(tabId, null),
    dataMode,
    firestore: repositories.firestore,
    onStatus: setLastAction,
    recordActivity,
    refreshAfterLiveWrite: workspaceTree.refreshLoadedRoots,
  });
  const authTab = useAuthTabState({
    activeProject,
    activeTab,
    initialAuthFilter: persistedWorkspace.snapshot?.authFilter,
    recordActivity,
    selectedUserId: selection.authUserId,
  });
  const jsTab = useJsTabState({
    activeTab,
    initialScripts: persistedWorkspace.snapshot?.scripts,
    recordActivity,
    selectedTreeItemId: selection.treeItemId,
  });
  const editingProject = editingProjectId
    ? projects.find((project) => project.id === editingProjectId) ?? null
    : null;
  const sidebarDefaultWidth = clampSidebarWidth(initialSidebarWidth);
  const projectCommands = useProjectCommandController({
    projects: repositories.projects,
    recordActivity,
    reloadProjects: projectsQuery.reload,
    setLastAction,
  });
  const workspaceSnapshot = useMemo(() => ({
    authFilter: authTab.authFilter,
    drafts: firestoreTab.drafts,
    scripts: jsTab.scripts,
    tabsState,
  }), [authTab.authFilter, firestoreTab.drafts, jsTab.scripts, tabsState]);

  useDocumentDensity(density);
  usePersistWorkspaceSnapshot(workspaceSnapshot, {
    enabled: persistedWorkspace.restored,
    onError: setWorkspacePersistenceError,
    settings: repositories.settings,
  });
  useEffect(() => {
    if (!workspacePersistenceError) return;
    setLastAction(`Workspace persistence failed: ${workspacePersistenceError.message}`);
    void recordActivity({
      action: workspacePersistenceError.operation === 'load'
        ? 'Load workspace state'
        : 'Save workspace state',
      area: 'workspace',
      error: { message: workspacePersistenceError.message },
      metadata: { operation: workspacePersistenceError.operation },
      status: 'failure',
      summary: workspacePersistenceError.message,
      target: { type: 'workspace' },
    });
  }, [recordActivity, workspacePersistenceError]);

  const tabModels = useMemo<ReadonlyArray<WorkspaceTabModel>>(
    () =>
      tabsState.tabs.map((tab) => ({
        id: tab.id,
        kind: tab.kind,
        title: tab.title,
        connectionId: tab.connectionId,
        canGoBack: tab.historyIndex > 0,
        canGoForward: tab.historyIndex < tab.history.length - 1,
      })),
    [tabsState.tabs],
  );

  const commands = useAppCommandPaletteController({
    activeTabKind: activeTab?.kind ?? null,
    onBack: handleBackInteraction,
    onChangeTheme: settings.changeTheme,
    onCloseTab: () => {
      if (activeTab) requestCloseTab(activeTab.id);
    },
    onFocusTreeFilter: handleFocusSearch,
    onForward: handleForwardInteraction,
    onNewTab: () => openTab(activeTab?.kind ?? 'firestore-query'),
    onOpenSettings: settings.openSettings,
    onOpenTab: openTab,
    onRunQuery: handleRunQuery,
    onRunScript: handleRunScript,
    onSelectTab: tabActions.selectTab,
    resolvedTheme: appearance.resolvedTheme,
    tabs: tabsState.tabs,
  });

  function handleBackInteraction() {
    const entry = tabActions.goBackInteraction();
    if (!entry) return;
    restoreInteraction(entry.activeTabId, entry.selectedTreeItemId, entry.path);
  }

  function handleForwardInteraction() {
    const entry = tabActions.goForwardInteraction();
    if (!entry) return;
    restoreInteraction(entry.activeTabId, entry.selectedTreeItemId, entry.path);
  }

  function restoreInteraction(tabId: string, selectedTreeItemId: string | null, path?: string) {
    if (path) tabActions.restorePath(tabId, path);
    selectionActions.selectTreeItem(selectedTreeItemId);
    setLastAction('Restored previous interaction');
  }

  function handleFocusSearch() {
    if (activeTab?.kind === 'auth-users') {
      document.querySelector<HTMLInputElement>('input[aria-label="Filter users"]')?.focus();
      return;
    }
    focusTreeFilter();
  }

  function requestDestructiveAction(action: DestructiveAction) {
    destructiveAction.request(action);
  }

  function requestCloseTab(tabId: string) {
    const tab = tabsState.tabs.find((item) => item.id === tabId);
    if (!tab) return;
    const isLastTab = tabsState.tabs.length === 1;
    requestDestructiveAction({
      confirmLabel: 'Close',
      description: isLastTab
        ? `Close ${tab.title}? The workspace will have no open tabs.`
        : `Close ${tab.title}? Unsaved tab state for this tab will be discarded.`,
      onConfirm: () => {
        closeTabsWithCleanup([tab], `Closed ${tab.title}`);
      },
      title: 'Close tab',
    });
  }

  function requestCloseOtherTabs(tabId: string) {
    const tab = tabsState.tabs.find((item) => item.id === tabId);
    const count = tabsState.tabs.length - 1;
    if (!tab || count <= 0) return;
    requestDestructiveAction({
      confirmLabel: 'Close others',
      description: `Close ${count} other tab${
        count === 1 ? '' : 's'
      }? Their tab state will be discarded.`,
      onConfirm: () => {
        const tabsToClose = tabsState.tabs.filter((item) => item.id !== tabId);
        closeTabsWithCleanup(tabsToClose, `Closed other tabs around ${tab.title}`);
      },
      title: 'Close other tabs',
    });
  }

  function requestCloseTabsToLeft(tabId: string) {
    const index = tabsState.tabs.findIndex((tab) => tab.id === tabId);
    if (index <= 0) return;
    requestDestructiveAction({
      confirmLabel: 'Close tabs',
      description: `Close ${index} tab${
        index === 1 ? '' : 's'
      } to the left? Their tab state will be discarded.`,
      onConfirm: () => {
        const tabsToClose = tabsState.tabs.slice(0, index);
        closeTabsWithCleanup(tabsToClose, 'Closed tabs to left');
      },
      title: 'Close tabs to left',
    });
  }

  function requestCloseTabsToRight(tabId: string) {
    const index = tabsState.tabs.findIndex((tab) => tab.id === tabId);
    const count = index < 0 ? 0 : tabsState.tabs.length - index - 1;
    if (count <= 0) return;
    requestDestructiveAction({
      confirmLabel: 'Close tabs',
      description: `Close ${count} tab${
        count === 1 ? '' : 's'
      } to the right? Their tab state will be discarded.`,
      onConfirm: () => {
        const tabsToClose = tabsState.tabs.slice(index + 1);
        closeTabsWithCleanup(tabsToClose, 'Closed tabs to right');
      },
      title: 'Close tabs to right',
    });
  }

  function requestCloseAllTabs() {
    if (!tabsState.tabs.length) return;
    requestDestructiveAction({
      confirmLabel: 'Close all',
      description: `Close all ${tabsState.tabs.length} open tab${
        tabsState.tabs.length === 1 ? '' : 's'
      }? The workspace will have no open tabs.`,
      onConfirm: () => {
        closeTabsWithCleanup(tabsState.tabs, 'Closed all tabs');
      },
      title: 'Close all tabs',
    });
  }

  function handleRemoveTreeItem(id: string) {
    const parsed = parseTreeId(id);
    if (parsed.kind !== 'project' || !parsed.connectionId) return;
    const connectionId = parsed.connectionId;
    const project = projects.find((item) => item.id === connectionId);
    requestDestructiveAction({
      confirmLabel: 'Remove',
      description: `Remove ${project?.name ?? 'this project'} from the workspace tree?`,
      onConfirm: () => {
        void projectCommands.removeProject(connectionId, project ?? null)
          .catch((error) => {
            setLastAction(`Remove failed: ${messageFromError(error, 'Could not remove project.')}`);
          });
      },
      title: 'Remove project',
    });
  }

  function handleEditTreeItem(id: string) {
    const parsed = parseTreeId(id);
    if (parsed.kind !== 'project' || !parsed.connectionId) return;
    setEditingProjectId(parsed.connectionId);
  }

  function handleCreateDocumentFromTree(id: string) {
    const parsed = parseTreeId(id);
    if (parsed.kind !== 'collection' || !parsed.connectionId || !parsed.path) return;
    const tabId = openFirestoreTab(parsed.connectionId, parsed.path);
    firestoreWrite.requestCreateDocument({
      collectionPath: parsed.path,
      requestId: nextCreateDocumentRequestId.current++,
      tabId,
    });
    tabActions.recordInteraction({
      activeTabId: tabId,
      path: parsed.path,
      selectedTreeItemId: id,
    });
    setLastAction(`Creating document in ${parsed.path}`);
  }

  function handleCreateCollectionFromTree(id: string) {
    const parsed = parseTreeId(id);
    if (parsed.kind !== 'firestore' || !parsed.connectionId) return;
    const tabId = openFirestoreTab(parsed.connectionId, DEFAULT_FIRESTORE_DRAFT.path);
    firestoreWrite.requestCreateDocument({
      collectionPath: '',
      collectionPathEditable: true,
      requestId: nextCreateDocumentRequestId.current++,
      tabId,
    });
    tabActions.recordInteraction({
      activeTabId: tabId,
      selectedTreeItemId: id,
    });
    setLastAction('Creating collection');
  }

  async function handleAddProject(input: ProjectAddInput): Promise<ProjectSummary> {
    return await projectCommands.addProject(input);
  }

  async function handleUpdateProject(
    id: string,
    patch: ProjectUpdatePatch,
  ): Promise<ProjectSummary> {
    return await projectCommands.updateProject(id, patch);
  }

  function handleRunQuery() {
    const path = firestoreTab.runQuery();
    if (path) setLastAction(`Ran query ${path}`);
  }

  function handleRefreshResults() {
    const path = firestoreTab.refreshQuery();
    if (path) setLastAction(`Refreshed results ${path}`);
  }

  function handleLoadMoreFirestore() {
    firestoreTab.loadMore();
    setLastAction(`Requested more results from ${firestoreTab.activeDraft.path}`);
  }

  function handleLoadMoreUsers() {
    authTab.loadMore();
  }

  function handleRunScript() {
    if (jsTab.isRunning) {
      handleCancelScript();
      return;
    }
    if (jsTab.runScript()) setLastAction('Ran JavaScript query');
  }

  function handleCancelScript() {
    if (jsTab.cancelScript()) setLastAction('Cancelled JavaScript query');
  }

  function openTab(kind: WorkspaceTabKind) {
    if (!activeTab || !activeProject) {
      setLastAction('Choose a connection item first');
      return null;
    }
    return tabActions.openTab({ kind, connectionId: activeTab.connectionId });
  }

  function openToolTab(kind: Exclude<WorkspaceTabKind, 'firestore-query'>, connectionId: string) {
    return tabActions.openOrSelectTab({ kind, connectionId });
  }

  function openJsTabInNewTab(connectionId: string) {
    return tabActions.openTab({ kind: 'js-query', connectionId });
  }

  function openFirestoreTab(connectionId: string, path: string) {
    return firestoreTab.openTab(connectionId, path);
  }

  function openFirestoreTabInNewTab(connectionId: string, path: string) {
    return firestoreTab.openTabInNewTab(connectionId, path);
  }

  const activeTabIsRefreshing = activeTab
    ? activeTab.kind === 'firestore-query'
      ? firestoreTab.isLoading
      : activeTab.kind === 'auth-users'
      ? authTab.usersIsLoading
      : activeTab.kind === 'js-query'
      ? jsTab.isRunning
      : false
    : false;

  const tabView: WorkspaceTabViewProps | null = activeTab
    ? {
      activeTab,
      auth: {
        errorMessage: authTab.errorMessage,
        filter: authTab.authFilter,
        hasMore: authTab.usersHasMore,
        isFetchingMore: authTab.usersIsFetchingMore,
        isLoading: authTab.usersIsLoading,
        onFilterChange: authTab.setAuthFilter,
        onLoadMore: handleLoadMoreUsers,
        onSaveCustomClaims: authTab.saveCustomClaims,
        onSelectUser: (uid) => selectionActions.selectAuthUser(uid),
        selectedUser: authTab.selectedUser,
        selectedUserId: selection.authUserId,
        users: authTab.users,
      },
      firestore: {
        createDocumentRequest: firestoreWrite.createDocumentRequest,
        draft: firestoreTab.activeDraft,
        errorMessage: firestoreTab.errorMessage,
        hasMore: firestoreTab.hasMore,
        isFetchingMore: firestoreTab.isFetchingMore,
        isLoading: firestoreTab.isLoading,
        onCreateDocument: firestoreWrite.createDocument,
        onCreateDocumentRequestHandled: firestoreWrite.handleCreateDocumentRequestHandled,
        onDeleteDocument: firestoreWrite.deleteDocument,
        onDraftChange: firestoreTab.setDraft,
        onGenerateDocumentId: firestoreWrite.generateDocumentId,
        onLoadMore: handleLoadMoreFirestore,
        onLoadSubcollections: handleLoadSubcollections,
        onOpenDocumentInNewTab: (path) => {
          const tabId = openFirestoreTabInNewTab(activeTab.connectionId, path);
          tabActions.recordInteraction({
            activeTabId: tabId,
            path,
            selectedTreeItemId: selection.treeItemId,
          });
          setLastAction(`Opened ${path} in new tab`);
        },
        onRefreshResults: handleRefreshResults,
        onReset: firestoreTab.resetDraft,
        onRunQuery: handleRunQuery,
        onSaveDocument: firestoreWrite.saveDocument,
        onSelectDocument: (path) => firestoreTab.selectDocument(activeTab.id, path),
        onUpdateDocumentFields: firestoreWrite.updateDocumentFields,
        rows: firestoreTab.queryRows,
        selectedDocument: firestoreTab.selectedDocument,
        selectedDocumentPath: firestoreTab.selectedDocumentPath,
        settings: repositories.settings,
      },
      script: {
        isRunning: jsTab.isRunning,
        onCancel: handleCancelScript,
        onRun: handleRunScript,
        onSourceChange: jsTab.setScriptSource,
        result: jsTab.scriptResult,
        runId: jsTab.scriptRunId,
        runStartedAt: jsTab.scriptStartedAt,
        settings: repositories.settings,
        source: jsTab.scriptSource,
      },
    }
    : null;

  function handleSelectTab(tabId: string) {
    tabActions.selectTab(tabId);
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId);
    const selectedTreeItemId = tab ? treeItemIdForTab(tab) : selection.treeItemId;
    selectionActions.selectTreeItem(selectedTreeItemId);
    tabActions.recordInteraction({
      activeTabId: tabId,
      selectedTreeItemId,
      ...(tab ? { path: activePath(tab) } : {}),
    });
    setLastAction(`Switched to ${tab?.title ?? 'tab'}`);
  }

  function handleActiveProjectChange(connectionId: string) {
    if (!activeTab) return;
    if (activeTab.connectionId === connectionId) return;
    tabActions.updateConnection(activeTab.id, connectionId);
    clearConnectionScopedTabState(activeTab);
    const nextTreeItemId = treeItemIdForTab({ ...activeTab, connectionId });
    selectionActions.selectTreeItem(nextTreeItemId);
    tabActions.recordInteraction({
      activeTabId: activeTab.id,
      path: activePath(activeTab),
      selectedTreeItemId: nextTreeItemId,
    });
    setLastAction('Changed tab account');
  }

  function clearConnectionScopedTabState(tab: WorkspaceTab) {
    clearTabRuntimeState(tab);
    selectionActions.selectAuthUser(null);
    authTab.clear();
  }

  function closeTabsWithCleanup(
    tabsToClose: ReadonlyArray<WorkspaceTab>,
    successLabel: string,
  ) {
    const busyTabIds = new Set(
      tabsToClose.filter((tab) => tab.kind !== 'js-query' && isTabBusy(tab)).map((tab) => tab.id),
    );
    const result = closeWorkspaceTabsCommand(tabsStore.state, {
      busyTabIds,
      successLabel,
      tabsToClose,
    });

    for (const tab of result.tabsToCleanup) clearTabRuntimeState(tab);
    tabsStore.setState(() => result.state);
    setLastAction(result.lastAction);
  }

  function clearTabRuntimeState(tab: WorkspaceTab) {
    firestoreTab.clearTab(tab.id);
    jsTab.clearTab(tab.id);
  }

  function isTabBusy(tab: WorkspaceTab): boolean {
    if (tab.kind === 'js-query') return jsTab.isTabRunning(tab.id);
    if (tab.kind === 'firestore-query') {
      return firestoreTab.isTabLoading(tab.id);
    }
    if (tab.kind === 'auth-users') {
      return authTab.isTabLoading(tab.id);
    }
    return false;
  }

  function handleRefreshActiveTab() {
    if (!activeTab) return;
    if (activeTab.kind === 'firestore-query') handleRunQuery();
    if (activeTab.kind === 'auth-users') authTab.refetch();
    if (activeTab.kind === 'js-query') handleRunScript();
    setLastAction(`Refreshed ${activeTab.title}`);
  }

  async function handleLoadSubcollections(
    documentPath: string,
  ): Promise<ReadonlyArray<FirestoreCollectionNode>> {
    if (!activeProject) throw new Error('Choose a project before loading subcollections.');
    return await repositories.firestore.listSubcollections(activeProject.id, documentPath);
  }

  function handleClearActivity() {
    requestDestructiveAction({
      confirmLabel: 'Clear',
      description: 'Clear local Activity entries?',
      onConfirm: () => {
        activity.clear();
      },
      title: 'Clear activity',
    });
  }

  function handleExportActivity() {
    activity.exportEntries();
  }

  function handleOpenActivityTarget(entry: ActivityLogEntry) {
    const intent = activity.openTargetIntent(entry);
    if (!intent) return;
    if (intent.type === 'firestore') {
      const tabId = openFirestoreTab(intent.connectionId, intent.path);
      tabActions.recordInteraction({
        activeTabId: tabId,
        path: intent.path,
        selectedTreeItemId: selection.treeItemId,
      });
      setLastAction(`Opened ${intent.path}`);
      return;
    }
    const tabId = openToolTab('auth-users', intent.connectionId);
    selectionActions.selectAuthUser(intent.uid);
    tabActions.recordInteraction({
      activeTabId: tabId,
      selectedTreeItemId: selection.treeItemId,
    });
    setLastAction(intent.uid ? `Opened ${intent.uid}` : 'Opened Authentication');
  }

  const desktopAppApi = getDesktopAppApi();

  return {
    commands,
    dialogs: {
      addProjectOpen,
      canOpenDataDirectory: Boolean(desktopAppApi),
      credentialWarning,
      dataDirectoryPath: settings.dataDirectoryPath,
      density,
      destructiveAction: destructiveAction.pendingAction,
      editingProject,
      projectsRepository: repositories.projects,
      settingsOpen: settings.open,
      onAddProjectOpenChange: setAddProjectOpen,
      onCredentialWarningDismiss: () => setCredentialWarning(null),
      onDensityChange: setDensity,
      onDestructiveActionOpenChange: destructiveAction.setOpen,
      onEditProjectOpenChange: (open: boolean) => {
        if (!open) setEditingProjectId(null);
      },
      onOpenDataDirectory: settings.openDataDirectory,
      onProjectAdded: (project: ProjectSummary) => {
        if (project.hasCredential && project.credentialEncrypted === false) {
          setCredentialWarning(
            `Credentials for ${project.name} are stored without OS encryption on this machine.`,
          );
        }
      },
      onProjectAddSubmit: handleAddProject,
      onProjectUpdateSubmit: handleUpdateProject,
      onSettingsOpenChange: settings.setOpen,
      onSettingsSaved: settings.recordSettingsSaved,
    },
    header: {
      canGoBack: tabsState.interactionHistoryIndex > 0,
      canGoForward: tabsState.interactionHistoryIndex < tabsState.interactionHistory.length - 1,
      dataMode,
      mode: appearance.mode,
      resolvedTheme: appearance.resolvedTheme,
      onAddProject: () => setAddProjectOpen(true),
      onBack: handleBackInteraction,
      onForward: handleForwardInteraction,
      onModeChange: settings.changeTheme,
      onOpenSettings: settings.openSettings,
    },
    layout: {
      sidebarCollapsed,
      sidebarDefaultWidth,
      sidebarMaxSize: sidebarCollapsed ? '40px' : `${MAX_SIDEBAR_WIDTH}px`,
      sidebarMinSize: sidebarCollapsed ? '40px' : `${MIN_SIDEBAR_WIDTH}px`,
      onSidebarResize: (size: number) => persistSidebarWidth(repositories, size),
    },
    sidebar: {
      collapsed: sidebarCollapsed,
      filterValue: workspaceTree.treeFilter,
      items: workspaceTree.treeItems,
      onAddProject: () => setAddProjectOpen(true),
      onCollapse: () => setSidebarCollapsed(true),
      onCreateCollection: handleCreateCollectionFromTree,
      onCreateDocument: handleCreateDocumentFromTree,
      onEditItem: handleEditTreeItem,
      onExpand: () => setSidebarCollapsed(false),
      onFilterChange: workspaceTree.setTreeFilter,
      onOpenItem: workspaceTree.handleOpenItem,
      onRefreshItem: workspaceTree.handleRefreshItem,
      onRemoveItem: handleRemoveTreeItem,
      onSelectItem: workspaceTree.handleSelectItem,
      onToggleItem: workspaceTree.handleToggleItem,
    },
    tabView,
    workspace: {
      activeProject,
      activeTab,
      activeTabIsRefreshing,
      activity: {
        area: activity.drawer.area,
        buttonBadge: activity.button.badge,
        buttonVariant: activity.button.variant,
        entries: activity.drawer.entries,
        expanded: activity.drawer.expanded,
        isLoading: activity.drawer.isLoading,
        open: activity.drawer.open,
        search: activity.drawer.search,
        status: activity.drawer.status,
      },
      lastAction,
      projects,
      selectedTreeItemId: selection.treeItemId,
      tabModels,
      tabsActiveId: tabsState.activeTabId,
      onActivityAreaChange: activity.setArea,
      onActivityClear: handleClearActivity,
      onActivityClose: activity.close,
      onActivityExpandedChange: activity.setExpanded,
      onActivityExport: handleExportActivity,
      onActivityOpenTarget: handleOpenActivityTarget,
      onActivitySearchChange: activity.setSearch,
      onActivityStatusChange: activity.setStatus,
      onActivityToggle: activity.toggle,
      onCloseAllTabs: requestCloseAllTabs,
      onCloseOtherTabs: requestCloseOtherTabs,
      onCloseTab: requestCloseTab,
      onCloseTabsToLeft: requestCloseTabsToLeft,
      onCloseTabsToRight: requestCloseTabsToRight,
      onConnectionChange: handleActiveProjectChange,
      onRefreshActiveTab: handleRefreshActiveTab,
      onReorderTabs: tabActions.reorderTabs,
      onSelectTab: handleSelectTab,
      onSortByProject: tabActions.sortByProject,
      onViewError: (message: string) => setLastAction(`View failed: ${message}`),
    },
  } satisfies AppShellController;
}

export interface AppShellController {
  readonly commands: ReadonlyArray<CommandPaletteItem>;
  readonly dialogs: {
    readonly addProjectOpen: boolean;
    readonly canOpenDataDirectory: boolean;
    readonly credentialWarning: string | null;
    readonly dataDirectoryPath: string | null | undefined;
    readonly density: DensityName;
    readonly destructiveAction: DestructiveAction | null;
    readonly editingProject: ProjectSummary | null;
    readonly projectsRepository: RepositorySet['projects'];
    readonly settingsOpen: boolean;
    readonly onAddProjectOpenChange: (open: boolean) => void;
    readonly onCredentialWarningDismiss: () => void;
    readonly onDensityChange: (density: DensityName) => void;
    readonly onDestructiveActionOpenChange: (open: boolean) => void;
    readonly onEditProjectOpenChange: (open: boolean) => void;
    readonly onOpenDataDirectory: () => Promise<void>;
    readonly onProjectAdded: (project: ProjectSummary) => void;
    readonly onProjectAddSubmit: (input: ProjectAddInput) => Promise<ProjectSummary>;
    readonly onProjectUpdateSubmit: (
      id: string,
      patch: ProjectUpdatePatch,
    ) => Promise<ProjectSummary>;
    readonly onSettingsOpenChange: (open: boolean) => void;
    readonly onSettingsSaved: ReturnType<typeof useSettingsController>['recordSettingsSaved'];
  };
  readonly header: {
    readonly canGoBack: boolean;
    readonly canGoForward: boolean;
    readonly dataMode: 'live' | 'mock';
    readonly mode: 'dark' | 'light' | 'system';
    readonly resolvedTheme: 'dark' | 'light';
    readonly onAddProject: () => void;
    readonly onBack: () => void;
    readonly onForward: () => void;
    readonly onModeChange: (mode: 'dark' | 'light' | 'system') => void;
    readonly onOpenSettings: () => void;
  };
  readonly layout: {
    readonly sidebarCollapsed: boolean;
    readonly sidebarDefaultWidth: number;
    readonly sidebarMaxSize: string;
    readonly sidebarMinSize: string;
    readonly onSidebarResize: (size: number) => void;
  };
  readonly sidebar: {
    readonly collapsed: boolean;
    readonly filterValue: string;
    readonly items: ReturnType<typeof useWorkspaceTree>['treeItems'];
    readonly onAddProject: () => void;
    readonly onCollapse: () => void;
    readonly onCreateCollection: (id: string) => void;
    readonly onCreateDocument: (id: string) => void;
    readonly onEditItem: (id: string) => void;
    readonly onExpand: () => void;
    readonly onFilterChange: (value: string) => void;
    readonly onOpenItem: (id: string) => void;
    readonly onRefreshItem: (id: string) => void;
    readonly onRemoveItem: (id: string) => void;
    readonly onSelectItem: (id: string) => void;
    readonly onToggleItem: (id: string) => void;
  };
  readonly tabView: WorkspaceTabViewProps | null;
  readonly workspace: {
    readonly activeProject: ProjectSummary | null;
    readonly activeTab: WorkspaceTab | undefined;
    readonly activeTabIsRefreshing: boolean;
    readonly activity: {
      readonly area: 'all' | ActivityLogEntry['area'];
      readonly buttonBadge: ReturnType<typeof useActivityController>['button']['badge'];
      readonly buttonVariant: ReturnType<typeof useActivityController>['button']['variant'];
      readonly entries: ReadonlyArray<ActivityLogEntry>;
      readonly expanded: boolean;
      readonly isLoading: boolean;
      readonly open: boolean;
      readonly search: string;
      readonly status: 'all' | ActivityLogEntry['status'];
    };
    readonly lastAction: string;
    readonly projects: ReadonlyArray<ProjectSummary>;
    readonly selectedTreeItemId: string | null;
    readonly tabModels: ReadonlyArray<WorkspaceTabModel>;
    readonly tabsActiveId: string;
    readonly onActivityAreaChange: (area: 'all' | ActivityLogEntry['area']) => void;
    readonly onActivityClear: () => void;
    readonly onActivityClose: () => void;
    readonly onActivityExpandedChange: (expanded: boolean) => void;
    readonly onActivityExport: () => void;
    readonly onActivityOpenTarget: (entry: ActivityLogEntry) => void;
    readonly onActivitySearchChange: (search: string) => void;
    readonly onActivityStatusChange: (status: 'all' | ActivityLogEntry['status']) => void;
    readonly onActivityToggle: () => void;
    readonly onCloseAllTabs: () => void;
    readonly onCloseOtherTabs: (tabId: string) => void;
    readonly onCloseTab: (tabId: string) => void;
    readonly onCloseTabsToLeft: (tabId: string) => void;
    readonly onCloseTabsToRight: (tabId: string) => void;
    readonly onConnectionChange: (connectionId: string) => void;
    readonly onRefreshActiveTab: () => void;
    readonly onReorderTabs: (activeId: string, overId: string) => void;
    readonly onSelectTab: (tabId: string) => void;
    readonly onSortByProject: () => void;
    readonly onViewError: (message: string) => void;
  };
}

function getDesktopAppApi(): DesktopAppApi | null {
  return typeof window !== 'undefined' ? window.firebaseDesk?.app ?? null : null;
}

function focusTreeFilter() {
  document.querySelector<HTMLInputElement>('input[aria-label="Filter account tree"]')?.focus();
}

function persistSidebarWidth(repositories: RepositorySet, size: number) {
  const width = clampSidebarWidth(size);
  document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  void repositories.settings.save({ sidebarWidth: width });
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
