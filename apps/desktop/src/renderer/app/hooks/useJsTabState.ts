import { JS_QUERY_SAMPLE_SOURCE } from '@firebase-desk/product-ui';
import type { ScriptRunEvent, ScriptRunResult } from '@firebase-desk/repo-contracts';
import { useEffect, useRef, useState } from 'react';
import { useRepositories } from '../RepositoryProvider.tsx';
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
  readonly scriptRunId: string | null;
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
  const [scriptRunIds, setScriptRunIds] = useState<Readonly<Record<string, string>>>({});
  const [activeRuns, setActiveRuns] = useState<Readonly<Record<string, ActiveScriptRun>>>({});
  const activeRunsRef = useRef<Readonly<Record<string, ActiveScriptRun>>>({});
  const scriptEventHandlerRef = useRef<(event: ScriptRunEvent) => void>(() => {});
  const repositories = useRepositories();
  const runScriptMutation = useRunScript();
  const cancelScriptMutation = useCancelScript();
  const scriptSource = activeTab
    ? scripts[activeTab.id] ?? JS_QUERY_SAMPLE_SOURCE
    : JS_QUERY_SAMPLE_SOURCE;
  const scriptResult = activeTab?.kind === 'js-query' ? scriptResults[activeTab.id] : undefined;
  const activeRun = activeTab?.kind === 'js-query' ? activeRuns[activeTab.id] : undefined;
  const scriptRunId = activeTab?.kind === 'js-query'
    ? activeRun?.runId ?? scriptRunIds[activeTab.id] ?? null
    : null;
  const scriptStartedAt = activeRun?.startedAt ?? null;

  scriptEventHandlerRef.current = handleScriptRunEvent;

  useEffect(() => {
    return repositories.scriptRunner.subscribe((event) => scriptEventHandlerRef.current(event));
  }, [repositories.scriptRunner]);

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
    setScriptRunIds((current) => ({ ...current, [tabId]: runId }));
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
            [tabId]: scriptErrorResult(error, current[tabId]),
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
    setScriptResults((current) => ({
      ...current,
      [tabId]: scriptCancelledResult(run.startedAt, current[tabId]),
    }));
    updateActiveRuns((current) => omitKey(current, tabId));
    cancelScriptMutation.mutate(run.runId, {
      onError: (error) => {
        setScriptResults((current) => {
          const tab = tabsStore.state.tabs.find((item) => item.id === tabId);
          const latestRun = activeRunsRef.current[tabId];
          if (!tab || tab.connectionId !== run.connectionId) return current;
          if (current[tabId]?.cancelled !== true) return current;
          if (latestRun && latestRun.runId !== run.runId) return current;
          return { ...current, [tabId]: scriptErrorResult(error, current[tabId]) };
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
    setScriptRunIds((current) => omitKey(current, tabId));
    setScripts((current) => omitKey(current, tabId));
    runScriptMutation.reset();
  }

  return {
    isRunning: Boolean(activeRun),
    scriptResult,
    scriptRunId,
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

  function handleScriptRunEvent(event: ScriptRunEvent): void {
    const tabEntry = tabForRun(event.runId);
    if (!tabEntry) return;
    const { run, tabId } = tabEntry;
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId);
    if (!tab || tab.connectionId !== run.connectionId) return;

    if (event.type === 'complete') {
      setScriptResults((current) => ({ ...current, [tabId]: event.result }));
      updateActiveRuns((current) => omitKey(current, tabId));
      return;
    }

    setScriptResults((current) => ({
      ...current,
      [tabId]: resultWithEvent(current[tabId], event, run.startedAt),
    }));
  }

  function tabForRun(
    runId: string,
  ): { readonly tabId: string; readonly run: ActiveScriptRun; } | null {
    for (const [tabId, run] of Object.entries(activeRunsRef.current)) {
      if (run.runId === runId) return { tabId, run };
    }
    return null;
  }
}

function createRunId(tabId: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${tabId}-${Date.now().toString(36)}-${random}`;
}

function scriptErrorResult(error: unknown, current?: ScriptRunResult): ScriptRunResult {
  return {
    returnValue: null,
    stream: current?.stream ?? [],
    logs: current?.logs ?? [],
    errors: [
      ...(current?.errors ?? []),
      {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : 'Could not run JavaScript query.',
        ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
      },
    ],
    durationMs: current?.durationMs ?? 0,
  };
}

function scriptCancelledResult(startedAt: number, current?: ScriptRunResult): ScriptRunResult {
  return {
    returnValue: null,
    stream: current?.stream ?? [],
    logs: [
      ...(current?.logs ?? []),
      { level: 'info', message: 'Script cancelled', timestamp: new Date().toISOString() },
    ],
    errors: current?.errors ?? [],
    durationMs: Math.max(0, Date.now() - startedAt),
    cancelled: true,
  };
}

function resultWithEvent(
  current: ScriptRunResult | undefined,
  event: Exclude<ScriptRunEvent, { readonly type: 'complete'; }>,
  startedAt: number,
): ScriptRunResult {
  const base = current ?? emptyRunningResult(startedAt);
  const durationMs = Math.max(0, Date.now() - startedAt);
  if (event.type === 'output') {
    return { ...base, stream: [...(base.stream ?? []), event.item], durationMs };
  }
  if (event.type === 'log') {
    return { ...base, logs: [...base.logs, event.log], durationMs };
  }
  return { ...base, errors: [...base.errors, event.error], durationMs };
}

function emptyRunningResult(startedAt: number): ScriptRunResult {
  return {
    returnValue: null,
    stream: [],
    logs: [],
    errors: [],
    durationMs: Math.max(0, Date.now() - startedAt),
  };
}
