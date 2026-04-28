import type {
  ScriptRunnerRepository,
  ScriptRunRequest,
  ScriptRunResult,
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
  readonly startedAt: number;
  cancelled: boolean;
  settled: boolean;
  resolve(result: ScriptRunResult): void;
}

export class ProcessScriptRunnerRepository implements ScriptRunnerRepository {
  private readonly activeRuns = new Map<string, ActiveRun>();
  private readonly cancelledRuns = new Set<string>();
  private readonly forkWorker: (workerPath: string) => ChildProcess;
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
        resolve,
        settled: false,
        startedAt,
      };
      this.activeRuns.set(request.runId, active);

      child.once('message', (message: unknown) => {
        const result = resultFromWorkerMessage(message);
        if (result) this.finish(request.runId, result);
      });
      child.once('error', (error) => {
        this.finish(request.runId, errorRunResult(error, this.duration(active)));
      });
      child.once('exit', (code, signal) => {
        const current = this.activeRuns.get(request.runId);
        if (!current || current.settled) return;
        if (current.cancelled) {
          this.finish(request.runId, cancelledResult(this.duration(current)));
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

  private finish(runId: string, result: ScriptRunResult): void {
    const active = this.activeRuns.get(runId);
    if (!active || active.settled) return;
    active.settled = true;
    this.activeRuns.delete(runId);
    active.resolve(result);
  }

  private duration(active: ActiveRun): number {
    return Math.max(0, this.now() - active.startedAt);
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

function cancelledResult(durationMs: number): ScriptRunResult {
  return {
    returnValue: null,
    stream: [],
    logs: [{ level: 'info', message: 'Script cancelled', timestamp: new Date().toISOString() }],
    errors: [],
    durationMs,
    cancelled: true,
  };
}

function errorRunResult(error: unknown, durationMs: number): ScriptRunResult {
  return {
    returnValue: null,
    stream: [],
    logs: [],
    errors: [scriptError(error)],
    durationMs,
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
