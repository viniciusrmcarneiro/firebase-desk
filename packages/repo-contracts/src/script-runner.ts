export type ScriptLogLevel = 'log' | 'info' | 'warn' | 'error';

export interface ScriptLogEntry {
  readonly level: ScriptLogLevel;
  readonly message: string;
  readonly timestamp: string;
}

export interface ScriptStreamItem {
  readonly id: string;
  readonly label: string;
  readonly badge: string;
  readonly view: 'json' | 'table';
  readonly value: unknown;
}

export interface ScriptRunError {
  readonly name?: string;
  readonly code?: string;
  readonly message: string;
  readonly stack?: string;
}

export interface ScriptRunResult {
  readonly returnValue: unknown;
  readonly stream?: ReadonlyArray<ScriptStreamItem>;
  readonly logs: ReadonlyArray<ScriptLogEntry>;
  readonly errors: ReadonlyArray<ScriptRunError>;
  readonly durationMs: number;
  readonly cancelled?: boolean;
}

export type ScriptRunEvent =
  | { readonly type: 'output'; readonly runId: string; readonly item: ScriptStreamItem; }
  | { readonly type: 'log'; readonly runId: string; readonly log: ScriptLogEntry; }
  | { readonly type: 'error'; readonly runId: string; readonly error: ScriptRunError; }
  | { readonly type: 'complete'; readonly runId: string; readonly result: ScriptRunResult; };

export type ScriptRunEventListener = (event: ScriptRunEvent) => void;

export interface ScriptRunRequest {
  readonly runId: string;
  readonly connectionId: string;
  readonly source: string;
}

export interface ScriptRunnerRepository {
  run(request: ScriptRunRequest): Promise<ScriptRunResult>;
  cancel(runId: string): Promise<void>;
  subscribe(listener: ScriptRunEventListener): () => void;
}
