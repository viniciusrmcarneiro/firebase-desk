import type { AppearanceMode, DensityName } from '@firebase-desk/design-tokens';
import { useHotkey } from '@firebase-desk/hotkeys';
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
  StatusBar,
  TargetModeBadge,
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
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import {
  ArrowLeft,
  ArrowRight,
  Database,
  ListChecks,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { type ActivityStore, useActivityController } from '../app-core/activity/index.ts';
import { firestoreQueryDraftMetadata } from '../app-core/firestore/query/index.ts';
import { useFirestoreWriteController } from '../app-core/firestore/write/index.ts';
import { useSettingsController } from '../app-core/settings/index.ts';
import {
  addProjectCommand,
  removeProjectCommand,
  updateProjectCommand,
} from '../app-core/workspace/projectCommands.ts';
import appIconUrl from '../assets/app-icon.png';
import { AddProjectDialog } from './dialogs/AddProjectDialog.tsx';
import { EditProjectDialog } from './dialogs/EditProjectDialog.tsx';
import { useAuthTabState } from './hooks/useAuthTabState.ts';
import { useDocumentDensity } from './hooks/useDocumentDensity.ts';
import { useFirestoreTabState } from './hooks/useFirestoreTabState.ts';
import { useJsTabState } from './hooks/useJsTabState.ts';
import {
  usePersistedWorkspaceState,
  usePersistWorkspaceSnapshot,
} from './hooks/usePersistedWorkspaceState.ts';
import { useProjects } from './hooks/useRepositoriesData.ts';
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

interface DestructiveAction {
  readonly confirmLabel: string;
  readonly description: string;
  readonly onConfirm: () => void;
  readonly title: string;
}

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
  const persistedWorkspace = usePersistedWorkspaceState();
  const appearance = useAppearance();
  const repositories = useRepositories();
  const queryClient = useQueryClient();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState<
    DestructiveAction | null
  >(null);
  const nextCreateDocumentRequestId = useRef(1);
  const activity = useActivityController({
    loadIssuePreviewOnMount: !activityStore,
    onStatus: setLastAction,
    repository: repositories.activity,
    store: activityStore,
  });
  const recordActivity = activity.record;
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
  const firestoreWrite = useFirestoreWriteController({
    activeProject,
    activeTab,
    clearSelectedDocument: (tabId) => firestoreTab.selectDocument(tabId, null),
    dataMode,
    firestore: repositories.firestore,
    invalidateFirestoreQueries: async () => {
      await queryClient.invalidateQueries({ queryKey: ['firestore'] });
    },
    onStatus: setLastAction,
    recordActivity,
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
  const editingProject = editingProjectId
    ? projects.find((project) => project.id === editingProjectId) ?? null
    : null;
  const sidebarDefaultWidth = clampSidebarWidth(initialSidebarWidth);
  const projectCommandEnv = useMemo(() => ({
    invalidateProjects: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    now: Date.now,
    projects: repositories.projects,
    recordActivity,
  }), [queryClient, recordActivity, repositories.projects]);
  const workspaceSnapshot = useMemo(() => ({
    authFilter: authTab.authFilter,
    drafts: firestoreTab.drafts,
    scripts: jsTab.scripts,
    tabsState,
  }), [authTab.authFilter, firestoreTab.drafts, jsTab.scripts, tabsState]);

  useDocumentDensity(density);
  usePersistWorkspaceSnapshot(workspaceSnapshot, { enabled: persistedWorkspace.restored });

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

  const commands = useMemo(() => [
    ...tabsState.tabs.map((tab) => ({
      id: `switch-${tab.id}`,
      label: `Switch to ${tab.title}`,
      onSelect: () => tabActions.selectTab(tab.id),
    })),
    { id: 'new-firestore', label: 'New Firestore tab', onSelect: () => openTab('firestore-query') },
    { id: 'new-auth', label: 'New Auth tab', onSelect: () => openTab('auth-users') },
    { id: 'new-js', label: 'New JS Query tab', onSelect: () => openTab('js-query') },
    { id: 'settings', label: 'Settings', onSelect: settings.openSettings },
    {
      id: 'theme',
      label: 'Toggle theme',
      onSelect: () => settings.changeTheme(appearance.resolvedTheme === 'dark' ? 'light' : 'dark'),
    },
    { id: 'focus-tree', label: 'Focus tree filter', onSelect: focusTreeFilter },
    { id: 'run-query', label: 'Run query', onSelect: handleRunQuery },
    { id: 'run-script', label: 'Run script', onSelect: handleRunScript },
  ], [
    appearance,
    settings,
    tabsState.tabs,
    activeTab,
    firestoreTab.activeDraft,
    activeProject,
    jsTab.isRunning,
    jsTab.scriptSource,
  ]);

  useHotkey('settings.open', (event) => {
    event.preventDefault();
    settings.openSettings();
  });
  useHotkey('tab.new', (event) => {
    event.preventDefault();
    openTab(activeTab?.kind ?? 'firestore-query');
  });
  useHotkey('tab.close', (event) => {
    event.preventDefault();
    if (activeTab) requestCloseTab(activeTab.id);
  });
  useHotkey('history.back', (event) => {
    event.preventDefault();
    handleBackInteraction();
  });
  useHotkey('history.forward', (event) => {
    event.preventDefault();
    handleForwardInteraction();
  });
  useHotkey('tree.focusFilter', (event) => {
    event.preventDefault();
    if (activeTab?.kind === 'auth-users') {
      document.querySelector<HTMLInputElement>('input[aria-label="Filter users"]')?.focus();
      return;
    }
    focusTreeFilter();
  });
  useHotkey('query.run', (event) => {
    if (activeTab?.kind !== 'firestore-query' && activeTab?.kind !== 'js-query') return;
    event.preventDefault();
    if (activeTab.kind === 'firestore-query') handleRunQuery();
    else handleRunScript();
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

  function requestDestructiveAction(action: DestructiveAction) {
    setPendingDestructiveAction(action);
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
        closeTabsWithCleanup([tab], () => tabActions.closeTab(tabId), `Closed ${tab.title}`);
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
        closeTabsWithCleanup(
          tabsToClose,
          () => tabActions.closeOtherTabs(tabId),
          `Closed other tabs around ${tab.title}`,
        );
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
        closeTabsWithCleanup(
          tabsToClose,
          () => tabActions.closeTabsToLeft(tabId),
          'Closed tabs to left',
        );
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
        closeTabsWithCleanup(
          tabsToClose,
          () => tabActions.closeTabsToRight(tabId),
          'Closed tabs to right',
        );
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
        closeTabsWithCleanup(tabsState.tabs, tabActions.closeAllTabs, 'Closed all tabs');
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
        void removeProjectCommand(projectCommandEnv, {
          connectionId,
          project: project ?? null,
        })
          .then((result) => setLastAction(result.lastAction))
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
    const result = await addProjectCommand(projectCommandEnv, input);
    setLastAction(result.lastAction);
    return result.result;
  }

  async function handleUpdateProject(
    id: string,
    patch: ProjectUpdatePatch,
  ): Promise<ProjectSummary> {
    const result = await updateProjectCommand(projectCommandEnv, { id, patch });
    setLastAction(result.lastAction);
    return result.result;
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
    const startedAt = Date.now();
    firestoreTab.loadMore();
    recordActivity({
      action: 'Load more results',
      area: 'firestore',
      durationMs: elapsedMs(startedAt),
      metadata: firestoreQueryDraftMetadata(firestoreTab.activeDraft),
      status: 'success',
      summary: `Requested more results from ${firestoreTab.activeDraft.path}`,
      target: {
        connectionId: activeTab?.connectionId,
        path: firestoreTab.activeDraft.path,
        type: 'firestore-query',
      },
    });
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
        authErrorMessage={authTab.errorMessage}
        authFilter={authTab.authFilter}
        draft={firestoreTab.activeDraft}
        firestoreErrorMessage={firestoreTab.errorMessage}
        hasMore={firestoreTab.hasMore}
        isFetchingMore={firestoreTab.isFetchingMore}
        isLoading={firestoreTab.isLoading}
        queryRows={firestoreTab.queryRows}
        repositories={repositories}
        scriptIsRunning={jsTab.isRunning}
        scriptResult={jsTab.scriptResult}
        scriptRunId={jsTab.scriptRunId}
        scriptStartedAt={jsTab.scriptStartedAt}
        scriptSource={jsTab.scriptSource}
        selectedDocument={firestoreTab.selectedDocument}
        selectedDocumentPath={firestoreTab.selectedDocumentPath}
        selectedUser={authTab.selectedUser}
        selectedUserId={selection.authUserId}
        users={authTab.users}
        usersHasMore={authTab.usersHasMore}
        usersIsFetchingMore={authTab.usersIsFetchingMore}
        usersIsLoading={authTab.usersIsLoading}
        createDocumentRequest={firestoreWrite.createDocumentRequest}
        onAuthFilterChange={authTab.setAuthFilter}
        onCancelScript={handleCancelScript}
        onCreateDocument={firestoreWrite.createDocument}
        onCreateDocumentRequestHandled={firestoreWrite.handleCreateDocumentRequestHandled}
        onDeleteDocument={firestoreWrite.deleteDocument}
        onDraftChange={firestoreTab.setDraft}
        onGenerateDocumentId={firestoreWrite.generateDocumentId}
        onLoadMore={handleLoadMoreFirestore}
        onLoadMoreUsers={handleLoadMoreUsers}
        onLoadSubcollections={handleLoadSubcollections}
        onOpenDocumentInNewTab={(path) => {
          const tabId = openFirestoreTabInNewTab(activeTab.connectionId, path);
          tabActions.recordInteraction({
            activeTabId: tabId,
            path,
            selectedTreeItemId: selection.treeItemId,
          });
          setLastAction(`Opened ${path} in new tab`);
        }}
        onReset={firestoreTab.resetDraft}
        onRefreshResults={handleRefreshResults}
        onRunQuery={handleRunQuery}
        onRunScript={handleRunScript}
        onSaveDocument={firestoreWrite.saveDocument}
        onUpdateDocumentFields={firestoreWrite.updateDocumentFields}
        onSaveUserCustomClaims={authTab.saveCustomClaims}
        onScriptChange={jsTab.setScriptSource}
        onSelectDocument={(path) => firestoreTab.selectDocument(activeTab.id, path)}
        onSelectUser={(uid) => selectionActions.selectAuthUser(uid)}
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
    closeAll: () => void,
    successLabel: string,
  ) {
    const blockedTabs = tabsToClose.filter((tab) => tab.kind !== 'js-query' && isTabBusy(tab));
    const blockedIds = new Set(blockedTabs.map((tab) => tab.id));
    const closableTabs = tabsToClose.filter((tab) => !blockedIds.has(tab.id));

    for (const tab of closableTabs) clearTabRuntimeState(tab);

    if (!closableTabs.length) {
      setLastAction(`Still loading ${blockedTabs[0]?.title ?? 'tab'}`);
      return;
    }

    if (blockedTabs.length) {
      for (const tab of closableTabs) tabActions.closeTab(tab.id);
      setLastAction(
        `${successLabel}; kept ${blockedTabs.length} busy tab${
          blockedTabs.length === 1 ? '' : 's'
        }`,
      );
      return;
    }

    closeAll();
    setLastAction(successLabel);
  }

  function clearTabRuntimeState(tab: WorkspaceTab) {
    cancelTabQueries(tab);
    firestoreTab.clearTab(tab.id);
    jsTab.clearTab(tab.id);
  }

  function cancelTabQueries(tab: WorkspaceTab) {
    if (tab.kind === 'firestore-query') {
      void queryClient.cancelQueries({ queryKey: ['firestore', 'query', tab.id] });
      void queryClient.cancelQueries({ queryKey: ['firestore', 'document', tab.id] });
    }
    if (tab.kind === 'auth-users') void queryClient.cancelQueries({ queryKey: ['auth', tab.id] });
  }

  function isTabBusy(tab: WorkspaceTab): boolean {
    if (tab.kind === 'js-query') return jsTab.isTabRunning(tab.id);
    if (tab.kind === 'firestore-query') {
      return queryClient.isFetching({ queryKey: ['firestore', 'query', tab.id] }) > 0
        || queryClient.isFetching({ queryKey: ['firestore', 'document', tab.id] }) > 0;
    }
    if (tab.kind === 'auth-users') {
      return queryClient.isFetching({ queryKey: ['auth', tab.id] }) > 0;
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
    <div className='relative grid h-full grid-rows-[40px_minmax(0,1fr)] bg-bg-app text-text-primary'>
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
      <ResizablePanelGroup direction='horizontal' className='h-full min-h-0'>
        <ResizablePanel
          className='h-full'
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
        <ResizablePanel className='h-full' minSize={`${MIN_WORKSPACE_WIDTH}px`}>
          <div className='grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto_auto]'>
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
            <StatusBar
              left={
                <>
                  {activeProject ? <TargetModeBadge mode={activeProject.target} /> : null}
                  <span>{activeProject?.name ?? 'No project'}</span>
                  <span>{activeProject?.projectId ?? 'No project id'}</span>
                  <span>{activeTab?.title ?? 'No tab'}</span>
                  <span>{selection.treeItemId ?? 'No tree selection'}</span>
                </>
              }
              right={
                <>
                  <Button
                    aria-pressed={activity.drawer.open}
                    size='xs'
                    variant={activity.button.variant}
                    onClick={activity.toggle}
                  >
                    <ListChecks size={13} aria-hidden='true' />
                    Activity
                    {activity.button.badge
                      ? (
                        <Badge variant={activity.button.badge.variant}>
                          {activity.button.badge.label}
                        </Badge>
                      )
                      : null}
                  </Button>
                  <span>{lastAction}</span>
                </>
              }
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
        action={pendingDestructiveAction}
        onOpenChange={(open) => {
          if (!open) setPendingDestructiveAction(null);
        }}
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
  readonly authErrorMessage: string | null;
  readonly authFilter: string;
  readonly createDocumentRequest: FirestoreCreateDocumentRequest | null;
  readonly draft: FirestoreQueryDraft;
  readonly firestoreErrorMessage: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly onAuthFilterChange: (value: string) => void;
  readonly onCancelScript: () => void;
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
  readonly onLoadMoreUsers: () => void;
  readonly onLoadSubcollections: (
    documentPath: string,
  ) => Promise<ReadonlyArray<FirestoreCollectionNode>>;
  readonly onOpenDocumentInNewTab: (documentPath: string) => void;
  readonly onReset: () => void;
  readonly onRefreshResults: () => void;
  readonly onRunQuery: () => void;
  readonly onRunScript: () => void;
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
  readonly onSaveUserCustomClaims: (
    uid: string,
    claims: Record<string, unknown>,
  ) => Promise<void> | void;
  readonly onScriptChange: (source: string) => void;
  readonly onSelectDocument: (documentPath: string) => void;
  readonly onSelectUser: (uid: string) => void;
  readonly queryRows: ReadonlyArray<FirestoreDocumentResult>;
  readonly repositories: RepositorySet;
  readonly scriptIsRunning: boolean;
  readonly scriptResult: ScriptRunResult | undefined;
  readonly scriptRunId: string | null;
  readonly scriptStartedAt: number | null;
  readonly scriptSource: string;
  readonly selectedDocument: FirestoreDocumentResult | null;
  readonly selectedDocumentPath: string | null;
  readonly selectedUser: AuthUser | null;
  readonly selectedUserId: string | null;
  readonly users: ReadonlyArray<AuthUser>;
  readonly usersHasMore: boolean;
  readonly usersIsFetchingMore: boolean;
  readonly usersIsLoading: boolean;
}

function TabView(props: TabViewProps) {
  if (props.activeTab.kind === 'auth-users') {
    return (
      <AuthUsersSurface
        errorMessage={props.authErrorMessage}
        filterValue={props.authFilter}
        hasMore={props.usersHasMore}
        isFetchingMore={props.usersIsFetchingMore}
        isLoading={props.usersIsLoading}
        selectedUser={props.selectedUser}
        selectedUserId={props.selectedUserId}
        users={props.users}
        onFilterChange={props.onAuthFilterChange}
        onLoadMore={props.onLoadMoreUsers}
        onSaveCustomClaims={props.onSaveUserCustomClaims}
        onSelectUser={props.onSelectUser}
      />
    );
  }
  if (props.activeTab.kind === 'js-query') {
    return (
      <JsQuerySurface
        isRunning={props.scriptIsRunning}
        result={props.scriptResult ?? null}
        runId={props.scriptRunId}
        runStartedAt={props.scriptStartedAt}
        settings={props.repositories.settings}
        source={props.scriptSource}
        onCancel={props.onCancelScript}
        onRun={props.onRunScript}
        onSourceChange={props.onScriptChange}
      />
    );
  }
  return (
    <FirestoreQuerySurface
      createDocumentRequest={props.createDocumentRequest}
      draft={props.draft}
      errorMessage={props.firestoreErrorMessage}
      hasMore={props.hasMore}
      isFetchingMore={props.isFetchingMore}
      isLoading={props.isLoading}
      rows={props.queryRows}
      selectedDocument={props.selectedDocument}
      selectedDocumentPath={props.selectedDocumentPath}
      settings={props.repositories.settings}
      onCreateDocument={props.onCreateDocument}
      onCreateDocumentRequestHandled={props.onCreateDocumentRequestHandled}
      onDraftChange={props.onDraftChange}
      onDeleteDocument={props.onDeleteDocument}
      onGenerateDocumentId={props.onGenerateDocumentId}
      onLoadMore={props.onLoadMore}
      onLoadSubcollections={props.onLoadSubcollections}
      onOpenDocumentInNewTab={props.onOpenDocumentInNewTab}
      onReset={props.onReset}
      onRefreshResults={props.onRefreshResults}
      onRun={props.onRunQuery}
      onSaveDocument={props.onSaveDocument}
      onUpdateDocumentFields={props.onUpdateDocumentFields}
      onSelectDocument={props.onSelectDocument}
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

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}
