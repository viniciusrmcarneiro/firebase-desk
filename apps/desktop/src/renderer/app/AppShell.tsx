import type { AppearanceMode, DensityName } from '@firebase-desk/design-tokens';
import { useHotkey } from '@firebase-desk/hotkeys';
import {
  AccountTree,
  AuthUsersSurface,
  CommandPalette,
  type FirestoreQueryDraft,
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
  AuthUser,
  FirestoreDocumentResult,
  ProjectSummary,
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
  Input,
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
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Settings,
  Sun,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import appIconUrl from '../assets/app-icon.png';
import { useAuthTabState } from './hooks/useAuthTabState.ts';
import { useFirestoreTabState } from './hooks/useFirestoreTabState.ts';
import { useJsTabState } from './hooks/useJsTabState.ts';
import { useProjects } from './hooks/useRepositoriesData.ts';
import { useWorkspaceTree } from './hooks/useWorkspaceTree.ts';
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
  type AccountTargetOption,
  clampSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MIN_WORKSPACE_WIDTH,
  parseTreeId,
  projectIdForAccount,
  projectTargetForOption,
  resolveProject,
  treeItemIdForTab,
} from './workspaceModel.ts';
import {
  loadPersistedWorkspaceState,
  savePersistedWorkspaceState,
} from './workspacePersistence.ts';

interface DestructiveAction {
  readonly confirmLabel: string;
  readonly description: string;
  readonly onConfirm: () => void;
  readonly title: string;
}

export interface AppShellProps {
  readonly initialSidebarWidth?: number;
}

export function AppShell({ initialSidebarWidth = DEFAULT_SIDEBAR_WIDTH }: AppShellProps) {
  const [persistedWorkspace] = useState(() => {
    const persisted = loadPersistedWorkspaceState();
    if (!persisted) return null;
    tabActions.restore(persisted.tabsState);
    const activeRestoredTab = persisted.tabsState.tabs.find((tab) =>
      tab.id === persisted.tabsState.activeTabId
    ) ?? persisted.tabsState.tabs[0];
    if (activeRestoredTab) selectionActions.selectTreeItem(treeItemIdForTab(activeRestoredTab));
    return persisted;
  });
  const appearance = useAppearance();
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const tabsState = useSelector(tabsStore, (state) => state);
  const selection = useSelector(selectionStore, (state) => state);
  const projectsQuery = useProjects();
  const projects = projectsQuery.data ?? [];
  const activeTab = tabsState.tabs.find((tab) => tab.id === tabsState.activeTabId)
    ?? tabsState.tabs[0];
  const activeProject = activeTab ? resolveProject(projects, activeTab.projectId) : null;
  const runtimeProjectId = activeProject?.projectId ?? null;

  const [density, setDensity] = useState<DensityName>('compact');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [lastAction, setLastAction] = useState('Ready');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState<
    DestructiveAction | null
  >(null);
  const firestoreTab = useFirestoreTabState({
    activeProject,
    activeTab,
    initialDrafts: persistedWorkspace?.drafts,
    selectedTreeItemId: selection.treeItemId,
  });
  const authTab = useAuthTabState({
    activeTab,
    initialAuthFilter: persistedWorkspace?.authFilter,
    runtimeProjectId,
    selectedUserId: selection.authUserId,
  });
  const jsTab = useJsTabState({
    activeProject,
    activeTab,
    initialScripts: persistedWorkspace?.scripts,
    selectedTreeItemId: selection.treeItemId,
  });
  const workspaceTree = useWorkspaceTree({
    activeTab,
    openFirestoreTab,
    openToolTab,
    projects,
    selectedTreeItemId: selection.treeItemId,
    setLastAction,
  });
  const sidebarDefaultWidth = clampSidebarWidth(initialSidebarWidth);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  useEffect(() => {
    savePersistedWorkspaceState({
      authFilter: authTab.authFilter,
      drafts: firestoreTab.drafts,
      scripts: jsTab.scripts,
      tabsState,
    });
  }, [authTab.authFilter, firestoreTab.drafts, jsTab.scripts, tabsState]);

  const tabModels = useMemo<ReadonlyArray<WorkspaceTabModel>>(
    () =>
      tabsState.tabs.map((tab) => ({
        id: tab.id,
        kind: tab.kind,
        title: tab.title,
        projectId: tab.projectId,
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
    { id: 'settings', label: 'Settings', onSelect: () => setSettingsOpen(true) },
    {
      id: 'theme',
      label: 'Toggle theme',
      onSelect: () =>
        void appearance.setMode(appearance.resolvedTheme === 'dark' ? 'light' : 'dark'),
    },
    { id: 'focus-tree', label: 'Focus tree filter', onSelect: focusTreeFilter },
    { id: 'run-query', label: 'Run query', onSelect: handleRunQuery },
    { id: 'run-script', label: 'Run script', onSelect: handleRunScript },
  ], [
    appearance,
    tabsState.tabs,
    activeTab,
    firestoreTab.activeDraft,
    activeProject,
    jsTab.scriptSource,
  ]);

  useHotkey('settings.open', (event) => {
    event.preventDefault();
    setSettingsOpen(true);
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
        : `Close ${tab.title}? Unsaved mocked tab state for this tab will be discarded.`,
      onConfirm: () => {
        tabActions.closeTab(tabId);
        setLastAction(`Closed ${tab.title}`);
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
      }? Their mocked tab state will be discarded.`,
      onConfirm: () => {
        tabActions.closeOtherTabs(tabId);
        setLastAction(`Closed other tabs around ${tab.title}`);
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
      } to the left? Their mocked tab state will be discarded.`,
      onConfirm: () => {
        tabActions.closeTabsToLeft(tabId);
        setLastAction('Closed tabs to left');
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
      } to the right? Their mocked tab state will be discarded.`,
      onConfirm: () => {
        tabActions.closeTabsToRight(tabId);
        setLastAction('Closed tabs to right');
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
        tabActions.closeAllTabs();
        setLastAction('Closed all tabs');
      },
      title: 'Close all tabs',
    });
  }

  function handleRemoveTreeItem(id: string) {
    const parsed = parseTreeId(id);
    if (parsed.kind !== 'project' || !parsed.projectId) return;
    const projectId = parsed.projectId;
    const project = projects.find((item) => item.id === projectId);
    requestDestructiveAction({
      confirmLabel: 'Remove',
      description: `Remove ${project?.name ?? 'this project'} from the workspace tree?`,
      onConfirm: () => {
        void repositories.projects.remove(projectId).then(() =>
          queryClient.invalidateQueries({ queryKey: ['projects'] })
        );
        setLastAction(`Removed ${project?.name ?? 'project'}`);
      },
      title: 'Remove project',
    });
  }

  function handleRunQuery() {
    const path = firestoreTab.runQuery();
    if (path) setLastAction(`Ran query ${path}`);
  }

  function handleRunScript() {
    if (jsTab.runScript()) setLastAction('Ran JavaScript query');
  }

  function openTab(kind: WorkspaceTabKind) {
    if (!activeTab || !activeProject) {
      setLastAction('Choose an account item first');
      return null;
    }
    return tabActions.openTab({ kind, projectId: activeTab.projectId });
  }

  function openToolTab(kind: Exclude<WorkspaceTabKind, 'firestore-query'>, projectId: string) {
    return tabActions.openOrSelectTab({ kind, projectId });
  }

  function openFirestoreTab(projectId: string, path: string) {
    return firestoreTab.openTab(projectId, path);
  }

  function openFirestoreTabInNewTab(projectId: string, path: string) {
    return firestoreTab.openTabInNewTab(projectId, path);
  }

  const activeView = activeTab
    ? (
      <TabView
        activeTab={activeTab}
        authFilter={authTab.authFilter}
        draft={firestoreTab.activeDraft}
        hasMore={firestoreTab.hasMore}
        isFetchingMore={firestoreTab.isFetchingMore}
        isLoading={firestoreTab.isLoading}
        queryRows={firestoreTab.queryRows}
        scriptIsRunning={jsTab.isRunning}
        scriptResult={jsTab.scriptResult}
        scriptSource={jsTab.scriptSource}
        selectedDocument={firestoreTab.selectedDocument}
        selectedDocumentPath={firestoreTab.selectedDocumentPath}
        selectedUser={authTab.selectedUser}
        selectedUserId={selection.authUserId}
        users={authTab.users}
        usersHasMore={authTab.usersHasMore}
        usersIsFetchingMore={authTab.usersIsFetchingMore}
        usersIsLoading={authTab.usersIsLoading}
        onAuthFilterChange={authTab.setAuthFilter}
        onDeleteDocument={(path) => handleDeleteDocument(path)}
        onDraftChange={firestoreTab.setDraft}
        onLoadMore={firestoreTab.loadMore}
        onLoadMoreUsers={authTab.loadMore}
        onOpenDocumentInNewTab={(path) => {
          const tabId = openFirestoreTabInNewTab(activeTab.projectId, path);
          tabActions.recordInteraction({
            activeTabId: tabId,
            path,
            selectedTreeItemId: selection.treeItemId,
          });
          setLastAction(`Opened ${path} in new tab`);
        }}
        onReset={firestoreTab.resetDraft}
        onRunQuery={handleRunQuery}
        onRunScript={handleRunScript}
        onSaveDocument={(path, data) => handleSaveDocument(path, data)}
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

  function handleActiveProjectChange(projectId: string) {
    if (!activeTab) return;
    if (activeTab.projectId === projectId) return;
    tabActions.updateProject(activeTab.id, projectId);
    clearAccountScopedTabState(activeTab.id);
    const nextTreeItemId = treeItemIdForTab({ ...activeTab, projectId });
    selectionActions.selectTreeItem(nextTreeItemId);
    tabActions.recordInteraction({
      activeTabId: activeTab.id,
      path: activePath(activeTab),
      selectedTreeItemId: nextTreeItemId,
    });
    setLastAction('Changed tab account');
  }

  function clearAccountScopedTabState(tabId: string) {
    firestoreTab.clearTab(tabId);
    jsTab.clearTab(tabId);
    selectionActions.selectAuthUser(null);
    authTab.clear();
  }

  function handleRefreshActiveTab() {
    if (!activeTab) return;
    if (activeTab.kind === 'firestore-query') handleRunQuery();
    if (activeTab.kind === 'auth-users') authTab.refetch();
    if (activeTab.kind === 'js-query') handleRunScript();
    setLastAction(`Refreshed ${activeTab.title}`);
  }

  function handleSaveDocument(documentPath: string, data: Record<string, unknown>) {
    if (!activeProject) return;
    void repositories.firestore.saveDocument(activeProject.projectId, documentPath, data).then(() =>
      queryClient.invalidateQueries({ queryKey: ['firestore'] })
    );
    setLastAction(`Saved ${documentPath}`);
  }

  function handleDeleteDocument(documentPath: string) {
    if (!activeProject || !activeTab) return;
    void repositories.firestore.deleteDocument(activeProject.projectId, documentPath).then(() =>
      queryClient.invalidateQueries({ queryKey: ['firestore'] })
    );
    firestoreTab.selectDocument(activeTab.id, null);
    setLastAction(`Deleted ${documentPath}`);
  }

  return (
    <div className='grid h-full grid-rows-[40px_minmax(0,1fr)] bg-bg-app text-text-primary'>
      <AppHeader
        canGoBack={tabsState.interactionHistoryIndex > 0}
        canGoForward={tabsState.interactionHistoryIndex < tabsState.interactionHistory.length - 1}
        mode={appearance.mode}
        resolvedTheme={appearance.resolvedTheme}
        onAddProject={() => setAddProjectOpen(true)}
        onBack={handleBackInteraction}
        onForward={handleForwardInteraction}
        onModeChange={(mode) => void appearance.setMode(mode)}
        onOpenSettings={() => setSettingsOpen(true)}
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
          <div className='grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]'>
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
                          onProjectChange={handleActiveProjectChange}
                        />
                        <Badge variant={activeProject.target}>{activeProject.target}</Badge>
                        <IconButton
                          icon={<RefreshCw size={14} aria-hidden='true' />}
                          label='Refresh tab'
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
              {activeView}
            </WorkspaceShell>
            <StatusBar
              left={
                <>
                  {activeProject ? <TargetModeBadge mode={activeProject.target} /> : null}
                  <span>{activeProject?.projectId ?? 'No project'}</span>
                  <span>{activeTab?.title ?? 'No tab'}</span>
                  <span>{selection.treeItemId ?? 'No tree selection'}</span>
                </>
              }
              right={<span>{lastAction}</span>}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <SettingsDialog
        density={density}
        open={settingsOpen}
        onDensityChange={setDensity}
        onOpenChange={setSettingsOpen}
      />
      <DestructiveActionDialog
        action={pendingDestructiveAction}
        onOpenChange={(open) => {
          if (!open) setPendingDestructiveAction(null);
        }}
      />
      <AddProjectDialog
        open={addProjectOpen}
        onOpenChange={setAddProjectOpen}
        onSubmit={(input) => {
          void repositories.projects.add(input).then(() =>
            queryClient.invalidateQueries({ queryKey: ['projects'] })
          );
        }}
      />
      <CommandPalette commands={commands} />
    </div>
  );
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
        <Badge>mock</Badge>
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
  readonly onProjectChange: (projectId: string) => void;
  readonly projects: ReadonlyArray<ProjectSummary>;
}

function ProjectSwitcher({ activeProject, onProjectChange, projects }: ProjectSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label='Select account' className='max-w-56 justify-start' variant='secondary'>
          <span className='text-text-muted'>Account</span>
          <span className='truncate'>{activeProject.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onSelect={() => onProjectChange(project.id)}
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
  readonly authFilter: string;
  readonly draft: FirestoreQueryDraft;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly onAuthFilterChange: (value: string) => void;
  readonly onDeleteDocument: (documentPath: string) => void;
  readonly onDraftChange: (draft: FirestoreQueryDraft) => void;
  readonly onLoadMore: () => void;
  readonly onLoadMoreUsers: () => void;
  readonly onOpenDocumentInNewTab: (documentPath: string) => void;
  readonly onReset: () => void;
  readonly onRunQuery: () => void;
  readonly onRunScript: () => void;
  readonly onSaveDocument: (documentPath: string, data: Record<string, unknown>) => void;
  readonly onScriptChange: (source: string) => void;
  readonly onSelectDocument: (documentPath: string) => void;
  readonly onSelectUser: (uid: string) => void;
  readonly queryRows: ReadonlyArray<FirestoreDocumentResult>;
  readonly scriptIsRunning: boolean;
  readonly scriptResult: ScriptRunResult | undefined;
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
        filterValue={props.authFilter}
        hasMore={props.usersHasMore}
        isFetchingMore={props.usersIsFetchingMore}
        isLoading={props.usersIsLoading}
        selectedUser={props.selectedUser}
        selectedUserId={props.selectedUserId}
        users={props.users}
        onFilterChange={props.onAuthFilterChange}
        onLoadMore={props.onLoadMoreUsers}
        onSelectUser={props.onSelectUser}
      />
    );
  }
  if (props.activeTab.kind === 'js-query') {
    return (
      <JsQuerySurface
        isRunning={props.scriptIsRunning}
        result={props.scriptResult ?? null}
        source={props.scriptSource}
        onRun={props.onRunScript}
        onSourceChange={props.onScriptChange}
      />
    );
  }
  return (
    <FirestoreQuerySurface
      draft={props.draft}
      hasMore={props.hasMore}
      isFetchingMore={props.isFetchingMore}
      isLoading={props.isLoading}
      rows={props.queryRows}
      selectedDocument={props.selectedDocument}
      selectedDocumentPath={props.selectedDocumentPath}
      onDraftChange={props.onDraftChange}
      onDeleteDocument={props.onDeleteDocument}
      onLoadMore={props.onLoadMore}
      onOpenDocumentInNewTab={props.onOpenDocumentInNewTab}
      onReset={props.onReset}
      onRun={props.onRunQuery}
      onSaveDocument={props.onSaveDocument}
      onSelectDocument={props.onSelectDocument}
    />
  );
}

interface AddProjectDialogProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (input: Omit<ProjectSummary, 'id'>) => void;
  readonly open: boolean;
}

function AddProjectDialog({ onOpenChange, onSubmit, open }: AddProjectDialogProps) {
  const [name, setName] = useState('New Client Dev');
  const [target, setTarget] = useState<AccountTargetOption>('mock-service-account');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} title='Add Firebase Account'>
        <div className='grid gap-3'>
          <label className='grid gap-1.5'>
            <span className='text-xs font-semibold text-text-secondary'>Display name</span>
            <Input
              aria-label='Display name'
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </label>
          <label className='grid gap-1.5'>
            <span className='text-xs font-semibold text-text-secondary'>Target</span>
            <select
              aria-label='Target'
              className='h-(--density-compact-control-height) rounded-md border border-border bg-bg-panel px-2 text-sm text-text-primary'
              value={target}
              onChange={(event) => setTarget(event.currentTarget.value as AccountTargetOption)}
            >
              <option value='mock-service-account'>Mock service account</option>
              <option value='local-emulator'>Local emulator</option>
              <option value='production-service-account'>Production service account</option>
            </select>
          </label>
          <div className='rounded-md border border-dashed border-border bg-bg-subtle p-3'>
            <strong className='text-sm text-text-primary'>service-account.json</strong>
            <div className='text-xs text-text-secondary'>
              Drop/select placeholder for final desktop app
            </div>
          </div>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <span className='text-xs text-text-muted'>Wireframe only. No credentials are read.</span>
          <div className='flex justify-end gap-2'>
            <Button variant='ghost' onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant='primary'
              onClick={() => {
                const accountName = name.trim() || 'New Client Dev';
                onSubmit({
                  name: accountName,
                  projectId: projectIdForAccount(accountName),
                  target: projectTargetForOption(target),
                });
                onOpenChange(false);
              }}
            >
              <Plus size={14} aria-hidden='true' /> Add mock
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
