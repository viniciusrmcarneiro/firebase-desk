import type { FirestoreQueryDraft } from '@firebase-desk/repo-contracts';
import type { SettingsRepository } from '@firebase-desk/repo-contracts';
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
  options: {
    readonly onError?: (error: WorkspacePersistenceFailure) => void;
    readonly settings: Pick<SettingsRepository, 'load'>;
  },
): PersistedWorkspaceStateResult {
  const { onError, settings } = options;
  const [result, setResult] = useState<PersistedWorkspaceStateResult>({
    restored: false,
    snapshot: null,
  });
  const restoredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadPersistedWorkspaceStateResult(settings).then((loadResult) => {
      if (cancelled) return;
      if (loadResult.error) onError?.(loadResult.error);
      if (!restoredRef.current) {
        restoredRef.current = true;
        const persistedWorkspace = loadResult.snapshot;
        if (persistedWorkspace) {
          tabActions.restore(persistedWorkspace.tabsState);
          const activeRestoredTab = persistedWorkspace.tabsState.tabs.find((tab) =>
            tab.id === persistedWorkspace.tabsState.activeTabId
          ) ?? persistedWorkspace.tabsState.tabs[0];
          if (activeRestoredTab) {
            selectionActions.selectTreeItem(treeItemIdForTab(activeRestoredTab));
          }
        }
      }
      setResult({ restored: true, snapshot: loadResult.snapshot });
    });
    return () => {
      cancelled = true;
    };
  }, [onError, settings]);

  return result;
}

export function usePersistWorkspaceSnapshot(
  snapshot: WorkspacePersistenceSnapshot,
  options: {
    readonly enabled: boolean;
    readonly onError?: (error: WorkspacePersistenceFailure) => void;
    readonly settings: Pick<SettingsRepository, 'save'>;
  },
): void {
  const { onError, settings } = options;
  const skippedInitialSaveRef = useRef(false);
  useEffect(() => {
    if (!options.enabled) {
      skippedInitialSaveRef.current = false;
      return;
    }
    if (!skippedInitialSaveRef.current) {
      skippedInitialSaveRef.current = true;
      return;
    }
    void savePersistedWorkspaceState(settings, snapshot).then((error) => {
      if (error) onError?.(error);
    });
  }, [onError, options.enabled, settings, snapshot]);
}
