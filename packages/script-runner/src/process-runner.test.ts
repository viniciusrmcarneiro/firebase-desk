import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { ProcessScriptRunnerRepository } from './process-runner.ts';

const noop = () => {};

class FakeChildProcess extends EventEmitter {
  killed = false;
  sent: unknown = null;

  send(message: unknown): boolean {
    this.sent = message;
    return true;
  }

  kill(): boolean {
    this.killed = true;
    setTimeout(() => this.emit('exit', null, 'SIGTERM'), 0);
    return true;
  }
}

describe('ProcessScriptRunnerRepository', () => {
  it('kills active children and resolves cancelled runs as normal results', async () => {
    const child = new FakeChildProcess();
    let now = 100;
    const repo = new ProcessScriptRunnerRepository(
      {
        async resolveConnection(connectionId) {
          return connectionFor(connectionId);
        },
      },
      {
        forkWorker: vi.fn(() => child as unknown as ChildProcess),
        now: () => now,
        workerPath: '/worker.js',
      },
    );

    const run = repo.run({
      runId: 'run-1',
      connectionId: 'emu',
      source: 'await new Promise(() => {});',
    });
    await Promise.resolve();
    now = 117;
    await repo.cancel('run-1');
    const result = await run;

    expect(child.killed).toBe(true);
    expect(child.sent).toMatchObject({
      type: 'run',
      request: { runId: 'run-1', connectionId: 'emu' },
    });
    expect(result).toMatchObject({
      returnValue: null,
      stream: [],
      errors: [],
      durationMs: 17,
      cancelled: true,
      logs: [expect.objectContaining({ message: 'Script cancelled' })],
    });
  });

  it('honors cancellation while connection resolution is still pending', async () => {
    const child = new FakeChildProcess();
    const forkWorker = vi.fn(() => child as unknown as ChildProcess);
    let releaseConnection = noop;
    const repo = new ProcessScriptRunnerRepository(
      {
        async resolveConnection(connectionId) {
          await new Promise<void>((resolve) => {
            releaseConnection = resolve;
          });
          return connectionFor(connectionId);
        },
      },
      { forkWorker, workerPath: '/worker.js' },
    );

    const run = repo.run({
      runId: 'run-2',
      connectionId: 'emu',
      source: 'return 1;',
    });
    await repo.cancel('run-2');
    releaseConnection();
    const result = await run;

    expect(forkWorker).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      returnValue: null,
      stream: [],
      errors: [],
      cancelled: true,
    });
  });
});

function connectionFor(connectionId: string) {
  return {
    credentialJson: null,
    project: {
      id: connectionId,
      name: 'Local Emulator',
      projectId: 'demo-local',
      target: 'emulator' as const,
      emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
      hasCredential: false,
      credentialEncrypted: null,
      createdAt: '2026-04-27T00:00:00.000Z',
    },
  };
}
