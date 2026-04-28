import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import type { ScriptWorkerMessage, ScriptWorkerResponse } from './types.ts';
import { runScriptInWorker } from './worker-runtime.ts';

const pendingSends = new Set<Promise<void>>();

export function startScriptWorkerProcess(): void {
  process.once('message', (message: unknown) => {
    void handleMessage(message);
  });
}

async function handleMessage(message: unknown): Promise<void> {
  const parsed = parseRunMessage(message);
  if (!parsed) {
    await queueSend({ type: 'error', error: 'Invalid script runner worker message.' });
    await finishProcess(1);
    return;
  }

  try {
    const result = await runScriptInWorker(
      parsed.request,
      parsed.connection,
      (event) => {
        void queueSend({ type: 'event', event });
      },
    );
    await queueSend({ type: 'result', result });
    await finishProcess(0);
  } catch (error) {
    await queueSend({ type: 'result', result: failedResult(error) });
    await finishProcess(0);
  }
}

function queueSend(message: ScriptWorkerResponse): Promise<void> {
  const pending = send(message).finally(() => pendingSends.delete(pending));
  pendingSends.add(pending);
  return pending;
}

async function finishProcess(exitCode: number): Promise<void> {
  await Promise.allSettled(pendingSends);
  process.exitCode = exitCode;
  if (process.connected) process.disconnect();
}

async function send(message: ScriptWorkerResponse): Promise<void> {
  await new Promise<void>((resolve) => {
    if (!process.send) {
      resolve();
      return;
    }
    process.send(message, () => resolve());
  });
}

function parseRunMessage(message: unknown): ScriptWorkerMessage | null {
  if (!message || typeof message !== 'object') return null;
  const record = message as Record<string, unknown>;
  if (record['type'] !== 'run') return null;
  return message as ScriptWorkerMessage;
}

function failedResult(error: unknown): ScriptRunResult {
  return {
    returnValue: null,
    stream: [],
    logs: [],
    errors: [errorResult(error)],
    durationMs: 0,
  };
}

function errorResult(error: unknown): ScriptRunResult['errors'][number] {
  if (isErrorLike(error)) {
    return {
      ...(error.name ? { name: error.name } : {}),
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  return { name: 'Error', message: String(error) };
}

function isErrorLike(
  value: unknown,
): value is { readonly message: string; readonly name?: string; readonly stack?: string; } {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { readonly message?: unknown; }).message === 'string';
}
