import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import type { ScriptWorkerMessage, ScriptWorkerResponse } from './types.ts';
import { runScriptInWorker } from './worker-runtime.ts';

export function startScriptWorkerProcess(): void {
  process.once('message', (message: unknown) => {
    void handleMessage(message);
  });
}

async function handleMessage(message: unknown): Promise<void> {
  const parsed = parseRunMessage(message);
  if (!parsed) {
    send({ type: 'error', error: 'Invalid script runner worker message.' });
    process.exit(1);
    return;
  }

  try {
    const result = await runScriptInWorker(parsed.request, parsed.connection);
    send({ type: 'result', result });
    process.exit(0);
  } catch (error) {
    send({ type: 'result', result: failedResult(error) });
    process.exit(0);
  }
}

function send(message: ScriptWorkerResponse): void {
  process.send?.(message);
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
