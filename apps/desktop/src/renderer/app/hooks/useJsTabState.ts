import { JS_QUERY_SAMPLE_SOURCE } from '@firebase-desk/product-ui';
import type { ScriptRunEvent, ScriptRunResult } from '@firebase-desk/repo-contracts';
import { useEffect, useMemo, useRef } from 'react';
import {
  cancelJsQueryCommand,
  clearJsQueryTabCommand,
  createJsQueryStore,
  type JsQueryCommandEnvironment,
  type JsQueryStore,
  receiveJsQueryEventCommand,
  runJsQueryCommand,
  selectIsJsQueryTabRunning,
  selectJsQueryTabModel,
  setJsQuerySourceCommand,
} from '../../app-core/js-query/index.ts';
import { useAppCoreSelector } from '../../app-core/shared/index.ts';
import { useRepositories } from '../RepositoryProvider.tsx';
import { activePath, tabActions, tabsStore, type WorkspaceTab } from '../stores/tabsStore.ts';

interface UseJsTabStateInput {
  readonly activeTab: WorkspaceTab | undefined;
  readonly initialScripts?: Readonly<Record<string, string>> | undefined;
  readonly recordActivity: JsQueryCommandEnvironment['recordActivity'];
  readonly selectedTreeItemId: string | null;
  readonly store?: JsQueryStore | undefined;
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

export function useJsTabState(
  {
    activeTab,
    initialScripts,
    recordActivity,
    selectedTreeItemId,
    store: inputStore,
  }: UseJsTabStateInput,
): JsTabState {
  const store = useMemo(
    () => inputStore ?? createJsQueryStore({ scripts: initialScripts }),
    [initialScripts, inputStore],
  );
  const state = useAppCoreSelector(store, (snapshot) => snapshot);
  const scriptEventHandlerRef = useRef<(event: ScriptRunEvent) => void>(() => {});
  const repositories = useRepositories();
  const model = selectJsQueryTabModel(state, activeTab, JS_QUERY_SAMPLE_SOURCE);
  const env: JsQueryCommandEnvironment = {
    cancelScript: (runId) => repositories.scriptRunner.cancel(runId),
    now: Date.now,
    randomToken: () => Math.random().toString(36).slice(2, 10),
    recordActivity,
    recordInteraction: tabActions.recordInteraction,
    runScript: (request) => repositories.scriptRunner.run(request),
  };

  scriptEventHandlerRef.current = handleScriptRunEvent;

  useEffect(() => {
    return repositories.scriptRunner.subscribe((event) => scriptEventHandlerRef.current(event));
  }, [repositories.scriptRunner]);

  function setScriptSource(source: string) {
    store.update((current) => setJsQuerySourceCommand(current, { source, tab: activeTab }));
  }

  function runScript(): boolean {
    return runJsQueryCommand(store, env, {
      interactionPath: activeTab ? activePath(activeTab) : 'scripts/default',
      selectedTreeItemId,
      source: model.source,
      tab: activeTab,
      tabIsCurrent,
    });
  }

  function cancelScript(): boolean {
    return cancelJsQueryCommand(store, env, { tab: activeTab, tabExists: tabIsCurrent });
  }

  function clearTab(tabId: string) {
    clearJsQueryTabCommand(store, env, tabId);
  }

  return {
    isRunning: model.isRunning,
    scriptResult: model.result,
    scriptRunId: model.runId,
    scriptStartedAt: model.startedAt,
    scripts: state.scripts,
    scriptSource: activeTab ? model.source : JS_QUERY_SAMPLE_SOURCE,
    cancelScript,
    clearTab,
    isTabRunning,
    runScript,
    setScriptSource,
  };

  function isTabRunning(tabId: string): boolean {
    return selectIsJsQueryTabRunning(store.get(), tabId);
  }

  function handleScriptRunEvent(event: ScriptRunEvent): void {
    receiveJsQueryEventCommand(store, env, { event, tabIsCurrent });
  }

  function tabIsCurrent(tabId: string, connectionId: string): boolean {
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId);
    return tab?.connectionId === connectionId;
  }
}
