import { JS_QUERY_SAMPLE_SOURCE } from '@firebase-desk/product-ui';
import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import { useRef, useState } from 'react';
import { activePath, tabActions, tabsStore, type WorkspaceTab } from '../stores/tabsStore.ts';
import { omitKey } from '../workspaceModel.ts';
import { useCancelScript, useRunScript } from './useRepositoriesData.ts';

interface UseJsTabStateInput {
  readonly activeTab: WorkspaceTab | undefined;
  readonly initialScripts?: Readonly<Record<string, string>> | undefined;
  readonly selectedTreeItemId: string | null;
}

export interface JsTabState {
  readonly isRunning: boolean;
  readonly scriptResult: ScriptRunResult | undefined;
  readonly scriptStartedAt: number | null;
  readonly scripts: Readonly<Record<string, string>>;
  readonly scriptSource: string;
  readonly cancelScript: () => boolean;
  readonly clearTab: (tabId: string) => void;
  readonly isTabRunning: (tabId: string) => boolean;
  readonly runScript: () => boolean;
  readonly setScriptSource: (source: string) => void;
}

interface ActiveScriptRun {
  readonly connectionId: string;
  readonly runId: string;
  readonly startedAt: number;
}

export function useJsTabState(
  { activeTab, initialScripts, selectedTreeItemId }: UseJsTabStateInput,
): JsTabState {
  const [scripts, setScripts] = useState<Readonly<Record<string, string>>>(
    () => initialScripts ?? {},
  );
  const [scriptResults, setScriptResults] = useState<Readonly<Record<string, ScriptRunResult>>>(
    {},
  );
  const [activeRuns, setActiveRuns] = useState<Readonly<Record<string, ActiveScriptRun>>>({});
  const activeRunsRef = useRef<Readonly<Record<string, ActiveScriptRun>>>({});
  const runScriptMutation = useRunScript();
  const cancelScriptMutation = useCancelScript();
  const scriptSource = activeTab
    ? scripts[activeTab.id] ?? JS_QUERY_SAMPLE_SOURCE
    : JS_QUERY_SAMPLE_SOURCE;
  const scriptResult = activeTab?.kind === 'js-query' ? scriptResults[activeTab.id] : undefined;
  const activeRun = activeTab?.kind === 'js-query' ? activeRuns[activeTab.id] : undefined;
  const scriptStartedAt = activeRun?.startedAt ?? null;

  function setScriptSource(source: string) {
    if (!activeTab) return;
    setScripts((current) => ({ ...current, [activeTab.id]: source }));
  }

  function runScript(): boolean {
    if (!activeTab || activeTab.kind !== 'js-query') return false;
    const tabId = activeTab.id;
    const connectionId = activeTab.connectionId;
    const startedAt = Date.now();
    const runId = createRunId(tabId);
    setScriptResults((current) => omitKey(current, tabId));
    updateActiveRuns((current) => ({ ...current, [tabId]: { connectionId, runId, startedAt } }));
    runScriptMutation.mutate(
      { runId, connectionId, source: scriptSource },
      {
        onSuccess: (result) => {
          const tab = tabsStore.state.tabs.find((item) => item.id === tabId);
          const currentRun = activeRunsForTab(tabId);
          if (tab?.connectionId !== connectionId || currentRun?.runId !== runId) return;
          setScriptResults((current) => ({ ...current, [tabId]: result }));
          updateActiveRuns((current) => omitKey(current, tabId));
        },
        onError: (error) => {
          const tab = tabsStore.state.tabs.find((item) => item.id === tabId);
          const currentRun = activeRunsForTab(tabId);
          if (tab?.connectionId !== connectionId || currentRun?.runId !== runId) return;
          setScriptResults((current) => ({
            ...current,
            [tabId]: scriptErrorResult(error),
          }));
          updateActiveRuns((current) => omitKey(current, tabId));
        },
      },
    );
    tabActions.recordInteraction({
      activeTabId: activeTab.id,
      path: activePath(activeTab),
      selectedTreeItemId,
    });
    return true;
  }

  function cancelScript(): boolean {
    if (!activeTab || !activeRun) return false;
    const tabId = activeTab.id;
    const run = activeRun;
    setScriptResults((current) => ({ ...current, [tabId]: scriptCancelledResult(run.startedAt) }));
    updateActiveRuns((current) => omitKey(current, tabId));
    cancelScriptMutation.mutate(run.runId, {
      onError: (error) => {
        setScriptResults((current) => {
          const tab = tabsStore.state.tabs.find((item) => item.id === tabId);
          const latestRun = activeRunsRef.current[tabId];
          if (!tab || tab.connectionId !== run.connectionId) return current;
          if (current[tabId]?.cancelled !== true) return current;
          if (latestRun && latestRun.runId !== run.runId) return current;
          return { ...current, [tabId]: scriptErrorResult(error) };
        });
      },
    });
    return true;
  }

  function clearTab(tabId: string) {
    const run = activeRunsRef.current[tabId];
    if (run) cancelScriptMutation.mutate(run.runId);
    updateActiveRuns((current) => omitKey(current, tabId));
    setScriptResults((current) => omitKey(current, tabId));
    setScripts((current) => omitKey(current, tabId));
    runScriptMutation.reset();
  }

  return {
    isRunning: Boolean(activeRun),
    scriptResult,
    scriptStartedAt,
    scripts,
    scriptSource,
    cancelScript,
    clearTab,
    isTabRunning,
    runScript,
    setScriptSource,
  };

  function activeRunsForTab(tabId: string): ActiveScriptRun | undefined {
    return tabsStore.state.tabs.some((item) => item.id === tabId)
      ? activeRunsRef.current[tabId]
      : undefined;
  }

  function updateActiveRuns(
    updater: (
      current: Readonly<Record<string, ActiveScriptRun>>,
    ) => Readonly<Record<string, ActiveScriptRun>>,
  ) {
    const next = updater(activeRunsRef.current);
    activeRunsRef.current = next;
    setActiveRuns(next);
  }

  function isTabRunning(tabId: string): boolean {
    return Boolean(activeRunsRef.current[tabId]);
  }
}

function createRunId(tabId: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${tabId}-${Date.now().toString(36)}-${random}`;
}

function scriptErrorResult(error: unknown): ScriptRunResult {
  return {
    returnValue: null,
    logs: [],
    errors: [{
      name: error instanceof Error ? error.name : 'Error',
      message: error instanceof Error ? error.message : 'Could not run JavaScript query.',
      ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
    }],
    durationMs: 0,
  };
}

function scriptCancelledResult(startedAt: number): ScriptRunResult {
  return {
    returnValue: null,
    stream: [],
    logs: [{ level: 'info', message: 'Script cancelled', timestamp: new Date().toISOString() }],
    errors: [],
    durationMs: Math.max(0, Date.now() - startedAt),
    cancelled: true,
  };
}
