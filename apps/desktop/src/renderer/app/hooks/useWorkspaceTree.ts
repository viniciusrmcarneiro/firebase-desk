import type { FirestoreCollectionNode, ProjectSummary } from '@firebase-desk/repo-contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRepositories } from '../RepositoryProvider.tsx';
import { selectionActions } from '../stores/selectionStore.ts';
import {
  activePath,
  tabActions,
  tabsStore,
  type WorkspaceTab,
  type WorkspaceTabKind,
} from '../stores/tabsStore.ts';
import {
  actionLabelForTreeItem,
  buildTreeItems,
  initialTreeCache,
  type LoadState,
  parentIdForStatus,
  parseTreeId,
  toggleSet,
  type TreeCache,
} from '../workspaceModel.ts';

interface UseWorkspaceTreeInput {
  readonly activeTab: WorkspaceTab | undefined;
  readonly openFirestoreTab: (connectionId: string, path: string) => string;
  readonly openFirestoreTabInNewTab: (connectionId: string, path: string) => string;
  readonly openJsTabInNewTab: (connectionId: string) => string;
  readonly openToolTab: (
    kind: Exclude<WorkspaceTabKind, 'firestore-query'>,
    connectionId: string,
  ) => string;
  readonly projects: ReadonlyArray<ProjectSummary>;
  readonly selectedTreeItemId: string | null;
  readonly setLastAction: (action: string) => void;
}

export function useWorkspaceTree(
  {
    activeTab,
    openFirestoreTab,
    openFirestoreTabInNewTab,
    openJsTabInNewTab,
    openToolTab,
    projects,
    selectedTreeItemId,
    setLastAction,
  }: UseWorkspaceTreeInput,
) {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const [treeFilter, setTreeFilter] = useState('');
  const [expandedTreeIds, setExpandedTreeIds] = useState<ReadonlySet<string>>(() => new Set());
  const [treeCache, setTreeCache] = useState<TreeCache>(initialTreeCache);
  const treeItems = useMemo(
    () => buildTreeItems(projects, expandedTreeIds, treeCache, selectedTreeItemId, treeFilter),
    [expandedTreeIds, projects, selectedTreeItemId, treeCache, treeFilter],
  );

  async function loadRoots(project: ProjectSummary, refresh = false) {
    const key = project.id;
    setRootState(key, { status: 'loading', items: [] });
    const queryKey = ['firestore', project.id, 'rootCollections'];
    if (refresh) await queryClient.invalidateQueries({ queryKey });
    try {
      const items = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => repositories.firestore.listRootCollections(project.id),
      });
      setRootState(key, { status: 'success', items });
      setLastAction(
        `Loaded ${items.length} root collection${
          items.length === 1 ? '' : 's'
        } from ${project.projectId}`,
      );
    } catch (error) {
      const errorMessage = messageFromError(error);
      setRootState(key, { status: 'error', items: [], errorMessage });
      setLastAction(`Firestore load failed: ${errorMessage}`);
    }
  }

  async function loadProjectTools(project: ProjectSummary, refresh = false) {
    const key = project.id;
    if (!refresh && treeCache.tools[key]?.status === 'success') return;
    setToolState(key, { status: 'loading', items: [] });
    try {
      await Promise.resolve();
      setToolState(key, { status: 'success', items: ['tools'] });
    } catch {
      setToolState(key, { status: 'error', items: [] });
    }
  }

  function handleToggleItem(id: string) {
    const statusParentId = parentIdForStatus(id);
    if (statusParentId) {
      handleRefreshItem(statusParentId);
      return;
    }
    const parsed = parseTreeId(id);
    const willExpand = !expandedTreeIds.has(id);
    setExpandedTreeIds((current) => toggleSet(current, id));
    if (!willExpand) return;
    const project = projects.find((item) => item.id === parsed.connectionId);
    if (!project) return;
    if (parsed.kind === 'project') void loadProjectTools(project);
    if (parsed.kind === 'firestore') void loadRoots(project);
  }

  function handleRefreshItem(id: string) {
    const retryParentId = parentIdForStatus(id) ?? id;
    const parsed = parseTreeId(retryParentId);
    const project = projects.find((item) => item.id === parsed.connectionId);
    if (!project) return;
    if (parsed.kind === 'project') void loadProjectTools(project, true);
    if (parsed.kind === 'firestore') void loadRoots(project, true);
    setLastAction(`Retried ${project.name}`);
  }

  function handleSelectItem(id: string) {
    const statusParentId = parentIdForStatus(id);
    if (statusParentId) {
      handleRefreshItem(statusParentId);
      return;
    }
    const parsed = parseTreeId(id);
    selectionActions.selectTreeItem(id);
    if (parsed.kind === 'status') return;
    let nextTabId = activeTab?.id ?? tabsStore.state.activeTabId;
    let nextPath = activeTab ? activePath(activeTab) : undefined;
    if (parsed.kind === 'auth' && parsed.connectionId) {
      nextTabId = openToolTab('auth-users', parsed.connectionId);
      nextPath = 'auth/users';
    }
    if (parsed.kind === 'script' && parsed.connectionId) {
      nextTabId = openToolTab('js-query', parsed.connectionId);
      nextPath = 'scripts/default';
    }
    if (parsed.kind === 'collection' && parsed.connectionId && parsed.path) {
      nextTabId = openFirestoreTab(parsed.connectionId, parsed.path);
      nextPath = parsed.path;
    }
    if (nextTabId) {
      tabActions.recordInteraction({
        activeTabId: nextTabId,
        selectedTreeItemId: id,
        ...(nextPath === undefined ? {} : { path: nextPath }),
      });
    }
    setLastAction(actionLabelForTreeItem(parsed.kind, parsed.path));
  }

  function handleOpenItem(id: string) {
    const parsed = parseTreeId(id);
    if (parsed.kind === 'auth' && parsed.connectionId) {
      const tabId = openToolTab('auth-users', parsed.connectionId);
      tabActions.recordInteraction({
        activeTabId: tabId,
        path: 'auth/users',
        selectedTreeItemId: id,
      });
      return;
    }
    if (parsed.kind === 'script' && parsed.connectionId) {
      const tabId = openJsTabInNewTab(parsed.connectionId);
      tabActions.recordInteraction({
        activeTabId: tabId,
        path: 'scripts/default',
        selectedTreeItemId: id,
      });
      return;
    }
    if (!parsed.connectionId || !parsed.path) return;
    const tabId = openFirestoreTabInNewTab(parsed.connectionId, parsed.path);
    tabActions.recordInteraction({ activeTabId: tabId, path: parsed.path, selectedTreeItemId: id });
  }

  function setRootState(key: string, state: LoadState<FirestoreCollectionNode>) {
    setTreeCache((current) => ({ ...current, roots: { ...current.roots, [key]: state } }));
  }

  function setToolState(key: string, state: LoadState<'tools'>) {
    setTreeCache((current) => ({ ...current, tools: { ...current.tools, [key]: state } }));
  }

  return {
    treeFilter,
    treeItems,
    handleOpenItem,
    handleRefreshItem,
    handleSelectItem,
    handleToggleItem,
    setTreeFilter,
  };
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Could not load Firestore collections.';
}
