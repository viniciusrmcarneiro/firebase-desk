import type { FirestoreQueryDraft } from '@firebase-desk/repo-contracts';
import { useEffect, useRef, useState } from 'react';
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

export interface PersistedWorkspaceStateResult {
  readonly restored: boolean;
  readonly snapshot: PersistedWorkspaceSnapshot | null;
}

export interface WorkspacePersistenceSnapshot {
  readonly authFilter: string;
  readonly drafts: Readonly<Record<string, FirestoreQueryDraft>>;
  readonly scripts: Readonly<Record<string, string>>;
  readonly tabsState: TabsState;
}

export function usePersistedWorkspaceState(): PersistedWorkspaceStateResult {
  const [persistedWorkspace] = useState(loadPersistedWorkspaceState);
  const [restored, setRestored] = useState(() => !persistedWorkspace);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (persistedWorkspace) {
      tabActions.restore(persistedWorkspace.tabsState);
      const activeRestoredTab = persistedWorkspace.tabsState.tabs.find((tab) =>
        tab.id === persistedWorkspace.tabsState.activeTabId
      ) ?? persistedWorkspace.tabsState.tabs[0];
      if (activeRestoredTab) {
        selectionActions.selectTreeItem(treeItemIdForTab(activeRestoredTab));
      }
    }
    setRestored(true);
  }, [persistedWorkspace]);

  return { restored, snapshot: persistedWorkspace };
}

export function usePersistWorkspaceSnapshot(
  snapshot: WorkspacePersistenceSnapshot,
  options: { readonly enabled: boolean; },
): void {
  useEffect(() => {
    if (!options.enabled) return;
    savePersistedWorkspaceState(snapshot);
  }, [options.enabled, snapshot]);
}
