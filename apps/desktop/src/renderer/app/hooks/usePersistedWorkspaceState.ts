import type { FirestoreQueryDraft } from '@firebase-desk/repo-contracts';
import { useEffect, useRef, useState } from 'react';
import { selectionActions } from '../stores/selectionStore.ts';
import { tabActions, type TabsState } from '../stores/tabsStore.ts';
import { treeItemIdForTab } from '../workspaceModel.ts';
import {
  loadPersistedWorkspaceStateResult,
  savePersistedWorkspaceState,
  type WorkspacePersistenceFailure,
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

export function usePersistedWorkspaceState(
  options: { readonly onError?: (error: WorkspacePersistenceFailure) => void; } = {},
): PersistedWorkspaceStateResult {
  const onError = options.onError;
  const [loadResult] = useState(loadPersistedWorkspaceStateResult);
  const persistedWorkspace = loadResult.snapshot;
  const [restored, setRestored] = useState(() => !persistedWorkspace);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (loadResult.error) onError?.(loadResult.error);
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
  }, [loadResult.error, onError, persistedWorkspace]);

  return { restored, snapshot: persistedWorkspace };
}

export function usePersistWorkspaceSnapshot(
  snapshot: WorkspacePersistenceSnapshot,
  options: {
    readonly enabled: boolean;
    readonly onError?: (error: WorkspacePersistenceFailure) => void;
  },
): void {
  const onError = options.onError;
  useEffect(() => {
    if (!options.enabled) return;
    const error = savePersistedWorkspaceState(snapshot);
    if (error) onError?.(error);
  }, [onError, options.enabled, snapshot]);
}
