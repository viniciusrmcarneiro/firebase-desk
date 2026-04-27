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

export interface ScriptRunResult {
  readonly returnValue: unknown;
  readonly stream?: ReadonlyArray<ScriptStreamItem>;
  readonly logs: ReadonlyArray<ScriptLogEntry>;
  readonly errors: ReadonlyArray<{
    readonly name?: string;
    readonly code?: string;
    readonly message: string;
    readonly stack?: string;
  }>;
  readonly durationMs: number;
}

export interface ScriptRunRequest {
  readonly projectId: string;
  readonly source: string;
  readonly timeoutMs?: number;
}

export interface ScriptRunnerRepository {
  run(request: ScriptRunRequest): Promise<ScriptRunResult>;
}
