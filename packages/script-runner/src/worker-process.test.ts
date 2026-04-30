import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startScriptWorkerProcess } from './worker-process.ts';

const runScriptInWorker = vi.hoisted(() => vi.fn());

vi.mock('./worker-runtime.ts', () => ({
  runScriptInWorker,
}));

const originalConnected = Object.getOwnPropertyDescriptor(process, 'connected');
const originalDisconnect = Object.getOwnPropertyDescriptor(process, 'disconnect');
const originalExitCode = process.exitCode;
const originalSend = Object.getOwnPropertyDescriptor(process, 'send');

describe('script worker process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    vi.spyOn(process, 'exit').mockImplementation(
      ((code?: string | number | null) => {
        if (typeof code === 'number') process.exitCode = code;
        return undefined as never;
      }) as typeof process.exit,
    );
  });

  afterEach(() => {
    restoreProcessProperty('connected', originalConnected);
    restoreProcessProperty('disconnect', originalDisconnect);
    restoreProcessProperty('send', originalSend);
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  it('flushes queued IPC messages before disconnecting', async () => {
    const completions: Array<() => void> = [];
    const disconnect = vi.fn();
    const send = vi.fn((message: unknown, callback?: () => void) => {
      completions.push(() => callback?.());
      return true;
    });
    Object.defineProperty(process, 'connected', { configurable: true, value: true });
    Object.defineProperty(process, 'disconnect', { configurable: true, value: disconnect });
    Object.defineProperty(process, 'send', { configurable: true, value: send });
    runScriptInWorker.mockImplementation(async (_request, _connection, onEvent) => {
      onEvent({
        type: 'log',
        runId: 'run-1',
        log: { level: 'info', message: 'ready', timestamp: '2026-04-28T00:00:00.000Z' },
      });
      return {
        returnValue: 1,
        stream: [],
        logs: [],
        errors: [],
        durationMs: 5,
      };
    });

    startScriptWorkerProcess();
    emitProcessMessage({
      type: 'run',
      request: { runId: 'run-1', connectionId: 'emu', source: 'return 1;' },
      connection: { project: { id: 'emu' }, credentialJson: null },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toMatchObject({ type: 'event' });
    expect(send.mock.calls[1]?.[0]).toMatchObject({ type: 'result' });
    expect(disconnect).not.toHaveBeenCalled();

    for (const complete of completions) complete();
    await flushAsyncWork();

    expect(process.exitCode).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(0);
    expect(disconnect.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(process.exit).mock.invocationCallOrder[0]!,
    );
  });

  it('exits with failure for invalid worker messages', async () => {
    const completions: Array<() => void> = [];
    const disconnect = vi.fn();
    const send = vi.fn((_message: unknown, callback?: () => void) => {
      completions.push(() => callback?.());
      return true;
    });
    Object.defineProperty(process, 'connected', { configurable: true, value: true });
    Object.defineProperty(process, 'disconnect', { configurable: true, value: disconnect });
    Object.defineProperty(process, 'send', { configurable: true, value: send });

    startScriptWorkerProcess();
    emitProcessMessage({ type: 'invalid' });
    await Promise.resolve();

    expect(send).toHaveBeenCalledWith(
      { type: 'error', error: 'Invalid script runner worker message.' },
      expect.any(Function),
    );
    expect(process.exit).not.toHaveBeenCalled();

    for (const complete of completions) complete();
    await flushAsyncWork();

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

function emitProcessMessage(message: unknown): void {
  (process as unknown as { emit(event: 'message', message: unknown): boolean; })
    .emit('message', message);
}

async function flushAsyncWork(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function restoreProcessProperty(
  property: 'connected' | 'disconnect' | 'send',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(process, property, descriptor);
  } else {
    Reflect.deleteProperty(process, property);
  }
}
