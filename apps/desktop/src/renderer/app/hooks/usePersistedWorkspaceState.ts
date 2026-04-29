import type { FirestoreQueryDraft } from '@firebase-desk/repo-contracts';
import { useEffect, useState } from 'react';
import { selectionActions } from '../stores/selectionStore.ts';
import { tabActions, type TabsState } from '../stores/tabsStore.ts';
import { treeItemIdForTab } from '../workspaceModel.ts';
import {
  loadPersistedWorkspaceState,
  savePersistedWorkspaceState,
} from '../workspacePersistence.ts';

export interface PersistedWorkspaceSnapshot {
  readonly authFilter?: string | undefined;
  readonly drafts?: Readonly<Record<string, FirestoreQueryDraft>> | undefined;
  readonly scripts?: Readonly<Record<string, string>> | undefined;
}

export interface WorkspacePersistenceSnapshot {
  readonly authFilter: string;
  readonly drafts: Readonly<Record<string, FirestoreQueryDraft>>;
  readonly scripts: Readonly<Record<string, string>>;
  readonly tabsState: TabsState;
}

export function usePersistedWorkspaceState(): PersistedWorkspaceSnapshot | null {
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
  return persistedWorkspace;
}

export function usePersistWorkspaceSnapshot(snapshot: WorkspacePersistenceSnapshot): void {
  useEffect(() => {
    savePersistedWorkspaceState(snapshot);
  }, [snapshot]);
}
