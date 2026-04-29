import { JS_QUERY_SAMPLE_SOURCE } from '@firebase-desk/product-ui';
import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import type { AppCoreCommandOptions } from '../shared/index.ts';

export interface ActiveScriptRun {
  readonly commandOptions?: AppCoreCommandOptions | undefined;
  readonly connectionId: string;
  readonly runId: string;
  readonly source: string;
  readonly startedAt: number;
}

export interface JsQueryState {
  readonly activeRuns: Readonly<Record<string, ActiveScriptRun>>;
  readonly loggedRunIds: ReadonlyArray<string>;
  readonly results: Readonly<Record<string, ScriptRunResult>>;
  readonly runIds: Readonly<Record<string, string>>;
  readonly scripts: Readonly<Record<string, string>>;
}

export interface CreateJsQueryStateInput {
  readonly scripts?: Readonly<Record<string, string>> | undefined;
}

export function createInitialJsQueryState(input: CreateJsQueryStateInput = {}): JsQueryState {
  return {
    activeRuns: {},
    loggedRunIds: [],
    results: {},
    runIds: {},
    scripts: input.scripts ?? {},
  };
}

export function scriptSourceForTab(
  state: JsQueryState,
  tabId: string | null | undefined,
): string {
  return tabId ? state.scripts[tabId] ?? JS_QUERY_SAMPLE_SOURCE : JS_QUERY_SAMPLE_SOURCE;
}
