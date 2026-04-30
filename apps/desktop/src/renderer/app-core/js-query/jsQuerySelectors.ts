import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import type { JsQueryState } from './jsQueryState.ts';
import { scriptSourceForTab } from './jsQueryState.ts';

export interface JsQueryTabLike {
  readonly id: string;
  readonly kind: string;
}

export interface JsQueryTabModel {
  readonly isRunning: boolean;
  readonly result: ScriptRunResult | undefined;
  readonly runId: string | null;
  readonly source: string;
  readonly startedAt: number | null;
}

export interface ScriptResultCounts {
  readonly errorCount: number;
  readonly logCount: number;
  readonly outputCount: number;
}

export function selectJsQueryTabModel(
  state: JsQueryState,
  activeTab: JsQueryTabLike | undefined,
  defaultSource: string,
): JsQueryTabModel {
  if (!activeTab || activeTab.kind !== 'js-query') {
    return {
      isRunning: false,
      result: undefined,
      runId: null,
      source: scriptSourceForTab(state, activeTab?.id, defaultSource),
      startedAt: null,
    };
  }
  const run = state.activeRuns[activeTab.id];
  return {
    isRunning: Boolean(run),
    result: state.results[activeTab.id],
    runId: run?.runId ?? state.runIds[activeTab.id] ?? null,
    source: scriptSourceForTab(state, activeTab.id, defaultSource),
    startedAt: run?.startedAt ?? null,
  };
}

export function selectIsJsQueryTabRunning(state: JsQueryState, tabId: string): boolean {
  return Boolean(state.activeRuns[tabId]);
}

export function scriptResultCounts(result: ScriptRunResult): ScriptResultCounts {
  return {
    errorCount: result.errors.length,
    logCount: result.logs.length,
    outputCount: result.stream?.length ?? 0,
  };
}
