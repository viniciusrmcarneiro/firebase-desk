import type { FirestoreQueryDraft } from '@firebase-desk/repo-contracts';
import type { SettingsRepository } from '@firebase-desk/repo-contracts';
import { useEffect, useRef, useState } from 'react';
import { restoreWorkspaceTabsCommand } from '../../app-core/workspace/index.ts';
import { selectionActions } from '../stores/selectionStore.ts';
import { type TabsState, tabsStore } from '../stores/tabsStore.ts';
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
          const restoreResult = restoreWorkspaceTabsCommand(persistedWorkspace.tabsState);
          tabsStore.setState(() => restoreResult.state);
          if (restoreResult.activeTab) {
            selectionActions.selectTreeItem(treeItemIdForTab(restoreResult.activeTab));
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
    readonly debounceMs?: number | undefined;
    readonly enabled: boolean;
    readonly onError?: (error: WorkspacePersistenceFailure) => void;
    readonly settings: Pick<SettingsRepository, 'save'>;
  },
): void {
  const { onError, settings } = options;
  const skippedInitialSaveRef = useRef(false);
  const lastQueuedSnapshotKeyRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearPendingSave() {
      if (!saveTimerRef.current) return;
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (!options.enabled) {
      skippedInitialSaveRef.current = false;
      lastQueuedSnapshotKeyRef.current = null;
      clearPendingSave();
      return;
    }
    const snapshotKey = JSON.stringify(snapshot);
    if (!skippedInitialSaveRef.current) {
      skippedInitialSaveRef.current = true;
      lastQueuedSnapshotKeyRef.current = snapshotKey;
      return;
    }
    if (lastQueuedSnapshotKeyRef.current === snapshotKey) return;
    lastQueuedSnapshotKeyRef.current = snapshotKey;
    clearPendingSave();
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void savePersistedWorkspaceState(settings, snapshot).then((error) => {
        if (error) onError?.(error);
      });
    }, options.debounceMs ?? 300);
    return clearPendingSave;
  }, [onError, options.debounceMs, options.enabled, settings, snapshot]);
}
