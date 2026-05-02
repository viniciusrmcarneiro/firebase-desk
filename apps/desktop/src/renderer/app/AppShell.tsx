import type { AppearanceMode, DensityName } from '@firebase-desk/design-tokens';
import {
  AccountTree,
  ActivityDrawer,
  AuthUsersSurface,
  CommandPalette,
  type DeleteDocumentOptions,
  type FirestoreCreateDocumentRequest,
  FirestoreQuerySurface,
  JsQuerySurface,
  SettingsDialog,
  SidebarShell,
  useAppearance,
  WorkspaceShell,
  type WorkspaceTabModel,
  WorkspaceTabStrip,
} from '@firebase-desk/product-ui';
import type {
  ActivityLogEntry,
  AuthUser,
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  FirestoreFieldPatchOperation,
  FirestoreQueryDraft,
  FirestoreSaveDocumentOptions,
  FirestoreSaveDocumentResult,
  FirestoreUpdateDocumentFieldsOptions,
  FirestoreUpdateDocumentFieldsResult,
  ProjectAddInput,
  ProjectSummary,
  ProjectUpdatePatch,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  InlineAlert,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Toolbar,
} from '@firebase-desk/ui';
import { useSelector } from '@tanstack/react-store';
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityStore } from '../app-core/activity/activityStore.ts';
import { useActivityController } from '../app-core/activity/useActivityController.ts';
import { useFirestoreWriteController } from '../app-core/firestore/write/useFirestoreWriteController.ts';
import { useSettingsController } from '../app-core/settings/useSettingsController.ts';
import { closeWorkspaceTabsCommand } from '../app-core/workspace/workspaceCommands.ts';
import appIconUrl from '../assets/app-icon.png';
import { AppStatusBar } from './AppStatusBar.tsx';
import { createCommandPaletteModel } from './commandPaletteModel.ts';
import { AddProjectDialog } from './dialogs/AddProjectDialog.tsx';
import { EditProjectDialog } from './dialogs/EditProjectDialog.tsx';
import { useAppShellHotkeys } from './hooks/useAppShellHotkeys.ts';
import { useAuthTabState } from './hooks/useAuthTabState.ts';
import {
  type DestructiveAction,
  useDestructiveActionController,
} from './hooks/useDestructiveActionController.ts';
import { useDocumentDensity } from './hooks/useDocumentDensity.ts';
import { useFirestoreTabState } from './hooks/useFirestoreTabState.ts';
import { useJsTabState } from './hooks/useJsTabState.ts';
import {
  usePersistedWorkspaceState,
  usePersistWorkspaceSnapshot,
} from './hooks/usePersistedWorkspaceState.ts';
import { useProjectCommandController } from './hooks/useProjectCommandController.ts';
import { useProjects } from './hooks/useProjects.ts';
import { useWorkspaceTree } from './hooks/useWorkspaceTree.ts';
import { RenderErrorBoundary } from './RenderErrorBoundary.tsx';
import { type RepositorySet, useRepositories } from './RepositoryProvider.tsx';
import { selectionActions, selectionStore } from './stores/selectionStore.ts';
import {
  activePath,
  tabActions,
  tabsStore,
  type WorkspaceTab,
  type WorkspaceTabKind,
} from './stores/tabsStore.ts';
import {
  clampSidebarWidth,
  DEFAULT_FIRESTORE_DRAFT,
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MIN_WORKSPACE_WIDTH,
  parseTreeId,
  resolveProject,
  treeItemIdForTab,
} from './workspaceModel.ts';
import type { WorkspacePersistenceFailure } from './workspacePersistence.ts';

export interface AppShellProps {
  readonly activityStore?: ActivityStore | undefined;
  readonly dataMode?: 'live' | 'mock';
  readonly initialSidebarWidth?: number;
}

export function AppShell(
  {
    activityStore,
    dataMode = 'mock',
    initialSidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  }: AppShellProps,
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

  const commands = createCommandPaletteModel({
    onChangeTheme: settings.changeTheme,
    onFocusTreeFilter: handleFocusSearch,
    onOpenSettings: settings.openSettings,
    onOpenTab: openTab,
    onRunQuery: handleRunQuery,
    onRunScript: handleRunScript,
    onSelectTab: tabActions.selectTab,
    resolvedTheme: appearance.resolvedTheme,
    tabs: tabsState.tabs,
  });

  useAppShellHotkeys({
    activeTabKind: activeTab?.kind ?? null,
    onBack: handleBackInteraction,
    onCloseTab: () => {
      if (activeTab) requestCloseTab(activeTab.id);
    },
    onFocusSearch: handleFocusSearch,
    onForward: handleForwardInteraction,
    onNewTab: () => openTab(activeTab?.kind ?? 'firestore-query'),
    onOpenSettings: settings.openSettings,
    onRunQuery: handleRunQuery,
    onRunScript: handleRunScript,
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

  const activeView = activeTab
    ? (
      <TabView
        activeTab={activeTab}
        auth={{
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
        }}
        firestore={{
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
        }}
        script={{
          isRunning: jsTab.isRunning,
          onCancel: handleCancelScript,
          onRun: handleRunScript,
          onSourceChange: jsTab.setScriptSource,
          result: jsTab.scriptResult,
          runId: jsTab.scriptRunId,
          runStartedAt: jsTab.scriptStartedAt,
          settings: repositories.settings,
          source: jsTab.scriptSource,
        }}
      />
    )
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

  return (
    <div className='relative grid h-full overflow-hidden grid-rows-[40px_minmax(0,1fr)] bg-bg-app text-text-primary'>
      <AppHeader
        canGoBack={tabsState.interactionHistoryIndex > 0}
        canGoForward={tabsState.interactionHistoryIndex < tabsState.interactionHistory.length - 1}
        dataMode={dataMode}
        mode={appearance.mode}
        resolvedTheme={appearance.resolvedTheme}
        onAddProject={() => setAddProjectOpen(true)}
        onBack={handleBackInteraction}
        onForward={handleForwardInteraction}
        onModeChange={settings.changeTheme}
        onOpenSettings={settings.openSettings}
      />
      <ResizablePanelGroup direction='horizontal' className='h-full min-h-0 overflow-hidden'>
        <ResizablePanel
          className='h-full overflow-hidden'
          defaultSize={sidebarCollapsed ? '40px' : `${sidebarDefaultWidth}px`}
          groupResizeBehavior='preserve-pixel-size'
          maxSize={sidebarCollapsed ? '40px' : `${MAX_SIDEBAR_WIDTH}px`}
          minSize={sidebarCollapsed ? '40px' : `${MIN_SIDEBAR_WIDTH}px`}
          onResize={(size) => persistSidebarWidth(repositories, size.inPixels)}
        >
          {sidebarCollapsed
            ? <SidebarRail onExpand={() => setSidebarCollapsed(false)} />
            : (
              <SidebarShell
                title={
                  <span className='flex min-w-0 flex-1 items-center justify-between gap-2'>
                    <span className='truncate'>Workspace Tree</span>
                    <IconButton
                      icon={<PanelLeftClose size={14} aria-hidden='true' />}
                      label='Collapse sidebar'
                      size='xs'
                      variant='ghost'
                      onClick={() => setSidebarCollapsed(true)}
                    />
                  </span>
                }
              >
                <AccountTree
                  filterValue={workspaceTree.treeFilter}
                  items={workspaceTree.treeItems}
                  onAddProject={() => setAddProjectOpen(true)}
                  onCreateCollection={handleCreateCollectionFromTree}
                  onCreateDocument={handleCreateDocumentFromTree}
                  onEditItem={handleEditTreeItem}
                  onFilterChange={workspaceTree.setTreeFilter}
                  onOpenItem={workspaceTree.handleOpenItem}
                  onRefreshItem={workspaceTree.handleRefreshItem}
                  onRemoveItem={handleRemoveTreeItem}
                  onSelectItem={workspaceTree.handleSelectItem}
                  onToggleItem={workspaceTree.handleToggleItem}
                />
              </SidebarShell>
            )}
        </ResizablePanel>
        <ResizableHandle className='h-full w-px' />
        <ResizablePanel className='h-full overflow-hidden' minSize={`${MIN_WORKSPACE_WIDTH}px`}>
          <div className='grid h-full min-h-0 overflow-hidden grid-rows-[minmax(0,1fr)_auto_auto]'>
            <WorkspaceShell
              className='h-full min-h-0'
              tabStrip={
                <WorkspaceTabStrip
                  activeTabId={tabsState.activeTabId}
                  projects={projects}
                  tabs={tabModels}
                  onCloseAllTabs={requestCloseAllTabs}
                  onCloseTab={requestCloseTab}
                  onCloseOtherTabs={requestCloseOtherTabs}
                  onCloseTabsToLeft={requestCloseTabsToLeft}
                  onCloseTabsToRight={requestCloseTabsToRight}
                  onReorderTabs={tabActions.reorderTabs}
                  onSelectTab={handleSelectTab}
                  onSortByProject={tabActions.sortByProject}
                />
              }
              toolbar={
                <Toolbar aria-label='Workspace toolbar'>
                  <span className='flex min-w-0 flex-1 items-center gap-2'>
                    <Database size={14} aria-hidden='true' />
                    <span className='truncate text-sm font-semibold text-text-primary'>
                      {activeTab?.title ?? 'No tab'}
                    </span>
                  </span>
                  {activeProject
                    ? (
                      <>
                        <ProjectSwitcher
                          activeProject={activeProject}
                          projects={projects}
                          onConnectionChange={handleActiveProjectChange}
                        />
                        <Badge variant={activeProject.target}>{activeProject.target}</Badge>
                        <IconButton
                          disabled={activeTabIsRefreshing}
                          icon={
                            <RefreshCw
                              className={activeTabIsRefreshing ? 'animate-spin' : undefined}
                              size={14}
                              aria-hidden='true'
                            />
                          }
                          label={activeTabIsRefreshing ? 'Refreshing tab' : 'Refresh tab'}
                          size='xs'
                          variant='ghost'
                          onClick={handleRefreshActiveTab}
                        />
                      </>
                    )
                    : null}
                </Toolbar>
              }
            >
              <RenderErrorBoundary
                label={activeTab?.title ?? 'Workspace'}
                resetKey={activeTab?.id ?? 'empty'}
                onError={(message) => setLastAction(`View failed: ${message}`)}
              >
                {activeView}
              </RenderErrorBoundary>
            </WorkspaceShell>
            <ActivityDrawer
              area={activity.drawer.area}
              entries={activity.drawer.entries}
              expanded={activity.drawer.expanded}
              isLoading={activity.drawer.isLoading}
              open={activity.drawer.open}
              search={activity.drawer.search}
              status={activity.drawer.status}
              onAreaChange={activity.setArea}
              onClear={handleClearActivity}
              onClose={activity.close}
              onExport={handleExportActivity}
              onExpandedChange={activity.setExpanded}
              onOpenTarget={handleOpenActivityTarget}
              onSearchChange={activity.setSearch}
              onStatusChange={activity.setStatus}
            />
            <AppStatusBar
              activeProject={activeProject}
              activeTabTitle={activeTab?.title ?? 'No tab'}
              activityBadge={activity.button.badge}
              activityButtonVariant={activity.button.variant}
              activityOpen={activity.drawer.open}
              lastAction={lastAction}
              selectedTreeItemId={selection.treeItemId}
              onActivityToggle={activity.toggle}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <SettingsDialog
        {...(desktopAppApi
          ? {
            dataDirectoryPath: settings.dataDirectoryPath,
            onOpenDataDirectory: settings.openDataDirectory,
          }
          : {})}
        density={density}
        open={settings.open}
        onDensityChange={setDensity}
        onOpenChange={settings.setOpen}
        onSettingsSaved={settings.recordSettingsSaved}
      />
      <DestructiveActionDialog
        action={destructiveAction.pendingAction}
        onOpenChange={destructiveAction.setOpen}
      />
      <AddProjectDialog
        open={addProjectOpen}
        projects={repositories.projects}
        onOpenChange={setAddProjectOpen}
        onProjectAdded={(project) => {
          if (project.hasCredential && project.credentialEncrypted === false) {
            setCredentialWarning(
              `Credentials for ${project.name} are stored without OS encryption on this machine.`,
            );
          }
        }}
        onSubmit={handleAddProject}
      />
      <EditProjectDialog
        open={Boolean(editingProject)}
        project={editingProject}
        onOpenChange={(open) => {
          if (!open) setEditingProjectId(null);
        }}
        onSubmit={handleUpdateProject}
      />
      {credentialWarning
        ? (
          <div className='pointer-events-none absolute left-1/2 top-12 z-popover w-[min(560px,calc(100%-24px))] -translate-x-1/2'>
            <InlineAlert
              variant='warning'
              className='pointer-events-auto flex items-center justify-between gap-3'
            >
              <span>{credentialWarning}</span>
              <IconButton
                icon={<X size={14} aria-hidden='true' />}
                label='Dismiss credential warning'
                size='xs'
                variant='ghost'
                onClick={() => setCredentialWarning(null)}
              />
            </InlineAlert>
          </div>
        )
        : null}
      <CommandPalette commands={commands} />
    </div>
  );
}

function getDesktopAppApi(): DesktopAppApi | null {
  return typeof window !== 'undefined' ? window.firebaseDesk?.app ?? null : null;
}

function DestructiveActionDialog(
  {
    action,
    onOpenChange,
  }: {
    readonly action: DestructiveAction | null;
    readonly onOpenChange: (open: boolean) => void;
  },
) {
  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent
        description={action?.description ?? null}
        title={action?.title ?? 'Confirm destructive action'}
      >
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant='danger'
            onClick={() => {
              action?.onConfirm();
              onOpenChange(false);
            }}
          >
            {action?.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AppHeaderProps {
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly dataMode: 'live' | 'mock';
  readonly mode: AppearanceMode;
  readonly onAddProject: () => void;
  readonly onBack: () => void;
  readonly onForward: () => void;
  readonly onModeChange: (mode: AppearanceMode) => void;
  readonly onOpenSettings: () => void;
  readonly resolvedTheme: 'dark' | 'light';
}

function AppHeader(
  {
    canGoBack,
    canGoForward,
    dataMode,
    mode,
    onAddProject,
    onBack,
    onForward,
    onModeChange,
    onOpenSettings,
    resolvedTheme,
  }: AppHeaderProps,
) {
  return (
    <header className='flex min-w-0 items-center gap-2 border-b border-border-subtle bg-bg-panel px-2'>
      <div className='flex h-full shrink-0 items-center gap-1 border-r border-border-subtle pr-2'>
        <IconButton
          disabled={!canGoBack}
          icon={<ArrowLeft size={14} aria-hidden='true' />}
          label='Back'
          size='xs'
          variant='ghost'
          onClick={onBack}
        />
        <IconButton
          disabled={!canGoForward}
          icon={<ArrowRight size={14} aria-hidden='true' />}
          label='Forward'
          size='xs'
          variant='ghost'
          onClick={onForward}
        />
      </div>
      <div className='flex min-w-0 items-center gap-2'>
        <span className='grid size-6 shrink-0 place-items-center overflow-hidden rounded-md border border-border-subtle bg-bg-surface shadow-sm'>
          <img src={appIconUrl} alt='' className='size-full object-cover' />
        </span>
        <strong className='truncate text-sm font-semibold text-text-primary'>Firebase Desk</strong>
        <Badge variant={dataMode === 'live' ? 'warning' : 'neutral'}>{dataMode}</Badge>
      </div>
      <div className='ml-auto flex shrink-0 items-center gap-2'>
        <Button variant='secondary' onClick={onOpenSettings}>
          <Settings size={14} aria-hidden='true' /> Settings
        </Button>
        <Button variant='primary' onClick={onAddProject}>
          <Plus size={14} aria-hidden='true' /> Add account
        </Button>
        <ThemeSegment mode={mode} resolvedTheme={resolvedTheme} onModeChange={onModeChange} />
      </div>
    </header>
  );
}

function SidebarRail({ onExpand }: { readonly onExpand: () => void; }) {
  return (
    <aside className='grid h-full grid-rows-[auto_minmax(0,1fr)] border-r border-border-subtle bg-bg-panel py-1'>
      <IconButton
        icon={<PanelLeftOpen size={14} aria-hidden='true' />}
        label='Expand sidebar'
        size='xs'
        variant='ghost'
        onClick={onExpand}
      />
      <div className='flex items-center justify-center [writing-mode:vertical-rl] text-[10px] font-semibold uppercase tracking-normal text-text-muted'>
        Tree
      </div>
    </aside>
  );
}

function ThemeSegment(
  {
    mode,
    onModeChange,
    resolvedTheme,
  }: {
    readonly mode: AppearanceMode;
    readonly onModeChange: (mode: AppearanceMode) => void;
    readonly resolvedTheme: 'dark' | 'light';
  },
) {
  const activeTheme = mode === 'system' ? resolvedTheme : mode;
  return (
    <div className='inline-flex items-center gap-0.5 rounded-md border border-border bg-bg-subtle p-0.5'>
      <IconButton
        icon={<Sun size={14} aria-hidden='true' />}
        label='Light theme'
        size='xs'
        variant={activeTheme === 'light' ? 'secondary' : 'ghost'}
        onClick={() => onModeChange('light')}
      />
      <IconButton
        icon={<Moon size={14} aria-hidden='true' />}
        label='Dark theme'
        size='xs'
        variant={activeTheme === 'dark' ? 'secondary' : 'ghost'}
        onClick={() => onModeChange('dark')}
      />
    </div>
  );
}

interface ProjectSwitcherProps {
  readonly activeProject: ProjectSummary;
  readonly onConnectionChange: (connectionId: string) => void;
  readonly projects: ReadonlyArray<ProjectSummary>;
}

function ProjectSwitcher({ activeProject, onConnectionChange, projects }: ProjectSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label='Select connection'
          className='max-w-56 justify-start'
          variant='secondary'
        >
          <span className='text-text-muted'>Connection</span>
          <span className='truncate'>{activeProject.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onSelect={() => onConnectionChange(project.id)}
          >
            <span className='min-w-0 flex-1 truncate'>{project.name}</span>
            <Badge variant={project.target}>{project.target}</Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TabViewProps {
  readonly activeTab: WorkspaceTab;
  readonly auth: AuthTabSurfaceModel;
  readonly firestore: FirestoreTabSurfaceModel;
  readonly script: ScriptTabSurfaceModel;
}

interface AuthTabSurfaceModel {
  readonly errorMessage: string | null;
  readonly filter: string;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly onFilterChange: (value: string) => void;
  readonly onLoadMore: () => void;
  readonly onSaveCustomClaims: (
    uid: string,
    claims: Record<string, unknown>,
  ) => Promise<void> | void;
  readonly onSelectUser: (uid: string) => void;
  readonly selectedUser: AuthUser | null;
  readonly selectedUserId: string | null;
  readonly users: ReadonlyArray<AuthUser>;
}

interface FirestoreTabSurfaceModel {
  readonly createDocumentRequest: FirestoreCreateDocumentRequest | null;
  readonly draft: FirestoreQueryDraft;
  readonly errorMessage: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly onCreateDocument: (
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ) => Promise<void> | void;
  readonly onCreateDocumentRequestHandled: (requestId: number) => void;
  readonly onDeleteDocument: (
    documentPath: string,
    options: DeleteDocumentOptions,
  ) => void;
  readonly onDraftChange: (draft: FirestoreQueryDraft) => void;
  readonly onGenerateDocumentId: (collectionPath: string) => Promise<string> | string;
  readonly onLoadMore: () => void;
  readonly onLoadSubcollections: (
    documentPath: string,
  ) => Promise<ReadonlyArray<FirestoreCollectionNode>>;
  readonly onOpenDocumentInNewTab: (documentPath: string) => void;
  readonly onReset: () => void;
  readonly onRefreshResults: () => void;
  readonly onRunQuery: () => void;
  readonly onSaveDocument: (
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
  ) => Promise<FirestoreSaveDocumentResult | void> | FirestoreSaveDocumentResult | void;
  readonly onUpdateDocumentFields: (
    documentPath: string,
    operations: ReadonlyArray<FirestoreFieldPatchOperation>,
    options: FirestoreUpdateDocumentFieldsOptions,
  ) =>
    | Promise<FirestoreUpdateDocumentFieldsResult | void>
    | FirestoreUpdateDocumentFieldsResult
    | void;
  readonly onSelectDocument: (documentPath: string) => void;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument: FirestoreDocumentResult | null;
  readonly selectedDocumentPath: string | null;
  readonly settings: RepositorySet['settings'];
}

interface ScriptTabSurfaceModel {
  readonly isRunning: boolean;
  readonly onCancel: () => void;
  readonly onRun: () => void;
  readonly onSourceChange: (source: string) => void;
  readonly result: ScriptRunResult | undefined;
  readonly runId: string | null;
  readonly runStartedAt: number | null;
  readonly settings: RepositorySet['settings'];
  readonly source: string;
}

function TabView(props: TabViewProps) {
  if (props.activeTab.kind === 'auth-users') {
    return (
      <AuthUsersSurface
        errorMessage={props.auth.errorMessage}
        filterValue={props.auth.filter}
        hasMore={props.auth.hasMore}
        isFetchingMore={props.auth.isFetchingMore}
        isLoading={props.auth.isLoading}
        selectedUser={props.auth.selectedUser}
        selectedUserId={props.auth.selectedUserId}
        users={props.auth.users}
        onFilterChange={props.auth.onFilterChange}
        onLoadMore={props.auth.onLoadMore}
        onSaveCustomClaims={props.auth.onSaveCustomClaims}
        onSelectUser={props.auth.onSelectUser}
      />
    );
  }
  if (props.activeTab.kind === 'js-query') {
    return (
      <JsQuerySurface
        isRunning={props.script.isRunning}
        result={props.script.result ?? null}
        runId={props.script.runId}
        runStartedAt={props.script.runStartedAt}
        settings={props.script.settings}
        source={props.script.source}
        onCancel={props.script.onCancel}
        onRun={props.script.onRun}
        onSourceChange={props.script.onSourceChange}
      />
    );
  }
  return (
    <FirestoreQuerySurface
      createDocumentRequest={props.firestore.createDocumentRequest}
      draft={props.firestore.draft}
      errorMessage={props.firestore.errorMessage}
      hasMore={props.firestore.hasMore}
      isFetchingMore={props.firestore.isFetchingMore}
      isLoading={props.firestore.isLoading}
      rows={props.firestore.rows}
      selectedDocument={props.firestore.selectedDocument}
      selectedDocumentPath={props.firestore.selectedDocumentPath}
      settings={props.firestore.settings}
      onCreateDocument={props.firestore.onCreateDocument}
      onCreateDocumentRequestHandled={props.firestore.onCreateDocumentRequestHandled}
      onDraftChange={props.firestore.onDraftChange}
      onDeleteDocument={props.firestore.onDeleteDocument}
      onGenerateDocumentId={props.firestore.onGenerateDocumentId}
      onLoadMore={props.firestore.onLoadMore}
      onLoadSubcollections={props.firestore.onLoadSubcollections}
      onOpenDocumentInNewTab={props.firestore.onOpenDocumentInNewTab}
      onReset={props.firestore.onReset}
      onRefreshResults={props.firestore.onRefreshResults}
      onRun={props.firestore.onRunQuery}
      onSaveDocument={props.firestore.onSaveDocument}
      onUpdateDocumentFields={props.firestore.onUpdateDocumentFields}
      onSelectDocument={props.firestore.onSelectDocument}
    />
  );
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
