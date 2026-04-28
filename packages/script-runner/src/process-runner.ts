import type {
  ScriptLogEntry,
  ScriptRunError,
  ScriptRunEvent,
  ScriptRunEventListener,
  ScriptRunnerRepository,
  ScriptRunRequest,
  ScriptRunResult,
  ScriptStreamItem,
} from '@firebase-desk/repo-contracts';
import { type ChildProcess, fork } from 'node:child_process';
import type { ScriptRunnerConnection, ScriptWorkerResponse } from './types.ts';

export interface ScriptRunnerConnectionResolver {
  resolveConnection(connectionId: string): Promise<ScriptRunnerConnection>;
}

export interface ProcessScriptRunnerOptions {
  readonly forkWorker?: (workerPath: string) => ChildProcess;
  readonly now?: () => number;
  readonly workerPath: string;
}

interface ActiveRun {
  readonly child: ChildProcess;
  readonly errors: ScriptRunError[];
  readonly logs: ScriptLogEntry[];
  readonly startedAt: number;
  readonly stream: ScriptStreamItem[];
  cancelled: boolean;
  settled: boolean;
  resolve(result: ScriptRunResult): void;
}

export class ProcessScriptRunnerRepository implements ScriptRunnerRepository {
  private readonly activeRuns = new Map<string, ActiveRun>();
  private readonly cancelledRuns = new Set<string>();
  private readonly forkWorker: (workerPath: string) => ChildProcess;
  private readonly listeners = new Set<ScriptRunEventListener>();
  private readonly now: () => number;
  private readonly resolver: ScriptRunnerConnectionResolver;
  private readonly workerPath: string;

  constructor(resolver: ScriptRunnerConnectionResolver, options: ProcessScriptRunnerOptions) {
    this.resolver = resolver;
    this.workerPath = options.workerPath;
    this.forkWorker = options.forkWorker ?? defaultForkWorker;
    this.now = options.now ?? (() => Date.now());
  }

  async run(request: ScriptRunRequest): Promise<ScriptRunResult> {
    if (this.activeRuns.has(request.runId)) {
      throw new Error(`Script run already active: ${request.runId}`);
    }

    const startedAt = this.now();
    if (this.cancelledRuns.delete(request.runId)) return cancelledResult(0);
    const connection = await this.resolver.resolveConnection(request.connectionId);
    if (this.cancelledRuns.delete(request.runId)) {
      return cancelledResult(Math.max(0, this.now() - startedAt));
    }

    return await new Promise<ScriptRunResult>((resolve) => {
      const child = this.forkWorker(this.workerPath);
      const active: ActiveRun = {
        child,
        cancelled: false,
        errors: [],
        logs: [],
        resolve,
        settled: false,
        startedAt,
        stream: [],
      };
      this.activeRuns.set(request.runId, active);

      child.on('message', (message: unknown) => {
        const event = eventFromWorkerMessage(message);
        if (event) {
          this.recordEvent(request.runId, event);
          return;
        }
        const result = resultFromWorkerMessage(message);
        if (result) this.finish(request.runId, resultWithPartial(active, result));
      });
      child.once('error', (error) => {
        this.finish(request.runId, errorRunResult(error, this.duration(active), active));
      });
      child.once('exit', (code, signal) => {
        const current = this.activeRuns.get(request.runId);
        if (!current || current.settled) return;
        if (current.cancelled) {
          this.finish(request.runId, cancelledResult(this.duration(current), current));
          return;
        }
        this.finish(
          request.runId,
          errorRunResult(
            new Error(
              `Script runner exited before completing (code ${code ?? 'null'}, signal ${
                signal ?? 'null'
              }).`,
            ),
            this.duration(current),
            current,
          ),
        );
      });

      try {
        child.send?.({ type: 'run', request, connection });
      } catch (error) {
        this.finish(request.runId, errorRunResult(error, this.duration(active)));
        child.kill();
      }
    });
  }

  async cancel(runId: string): Promise<void> {
    const active = this.activeRuns.get(runId);
    if (!active) {
      this.cancelledRuns.add(runId);
      return;
    }
    active.cancelled = true;
    active.child.kill();
  }

  subscribe(listener: ScriptRunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private recordEvent(runId: string, event: ScriptRunEvent): void {
    const active = this.activeRuns.get(runId);
    if (!active || active.settled || event.runId !== runId) return;
    if (event.type === 'output') active.stream.push(event.item);
    else if (event.type === 'log') active.logs.push(event.log);
    else if (event.type === 'error') active.errors.push(event.error);
    this.emit(event);
  }

  private finish(runId: string, result: ScriptRunResult): void {
    const active = this.activeRuns.get(runId);
    if (!active || active.settled) return;
    active.settled = true;
    this.activeRuns.delete(runId);
    this.emit({ type: 'complete', runId, result });
    active.resolve(result);
  }

  private duration(active: ActiveRun): number {
    return Math.max(0, this.now() - active.startedAt);
  }

  private emit(event: ScriptRunEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

function defaultForkWorker(workerPath: string): ChildProcess {
  return fork(workerPath, [], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    execArgv: [],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
}

function resultFromWorkerMessage(message: unknown): ScriptRunResult | null {
  if (!message || typeof message !== 'object') return null;
  const record = message as ScriptWorkerResponse;
  if (record.type === 'result') return record.result;
  if (record.type === 'error') return errorRunResult(new Error(record.error), 0);
  return null;
}

function eventFromWorkerMessage(message: unknown): ScriptRunEvent | null {
  if (!message || typeof message !== 'object') return null;
  const record = message as ScriptWorkerResponse;
  return record.type === 'event' ? record.event : null;
}

function cancelledResult(durationMs: number, active?: ActiveRun): ScriptRunResult {
  return {
    returnValue: null,
    stream: active?.stream ?? [],
    logs: [
      ...(active?.logs ?? []),
      { level: 'info', message: 'Script cancelled', timestamp: new Date().toISOString() },
    ],
    errors: active?.errors ?? [],
    durationMs,
    cancelled: true,
  };
}

function errorRunResult(error: unknown, durationMs: number, active?: ActiveRun): ScriptRunResult {
  return {
    returnValue: null,
    stream: active?.stream ?? [],
    logs: active?.logs ?? [],
    errors: [...(active?.errors ?? []), scriptError(error)],
    durationMs,
  };
}

function resultWithPartial(active: ActiveRun, result: ScriptRunResult): ScriptRunResult {
  return {
    ...result,
    stream: result.stream ?? active.stream,
    logs: result.logs.length ? result.logs : active.logs,
    errors: result.errors.length ? result.errors : active.errors,
  };
}

function scriptError(error: unknown): ScriptRunResult['errors'][number] {
  if (isErrorLike(error)) {
    return {
      ...(error.name ? { name: error.name } : {}),
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  return { name: 'ScriptRunnerError', message: String(error) };
}

function isErrorLike(
  value: unknown,
): value is { readonly message: string; readonly name?: string; readonly stack?: string; } {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { readonly message?: unknown; }).message === 'string';
}
