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
    const events: unknown[] = [];
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
    repo.subscribe((event) => events.push(event));

    const run = repo.run({
      runId: 'run-1',
      connectionId: 'emu',
      source: 'await new Promise(() => {});',
    });
    await Promise.resolve();
    child.emit('message', {
      type: 'event',
      event: {
        type: 'output',
        runId: 'run-1',
        item: { id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 },
      },
    });
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
      stream: [{ id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 }],
      errors: [],
      durationMs: 17,
      cancelled: true,
      logs: [expect.objectContaining({ message: 'Script cancelled' })],
    });
    expect(events).toEqual([
      expect.objectContaining({ type: 'output', runId: 'run-1' }),
      expect.objectContaining({
        type: 'complete',
        runId: 'run-1',
        result: expect.objectContaining({ cancelled: true }),
      }),
    ]);
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

  it('relays worker events before resolving the final result', async () => {
    const child = new FakeChildProcess();
    const events: unknown[] = [];
    const repo = new ProcessScriptRunnerRepository(
      {
        async resolveConnection(connectionId) {
          return connectionFor(connectionId);
        },
      },
      {
        forkWorker: vi.fn(() => child as unknown as ChildProcess),
        workerPath: '/worker.js',
      },
    );
    repo.subscribe((event) => events.push(event));

    const run = repo.run({
      runId: 'run-3',
      connectionId: 'emu',
      source: 'yield 1; return 2;',
    });
    await Promise.resolve();
    child.emit('message', {
      type: 'event',
      event: {
        type: 'log',
        runId: 'run-3',
        log: { level: 'info', message: 'ready', timestamp: '2026-04-28T00:00:00.000Z' },
      },
    });
    child.emit('message', {
      type: 'event',
      event: {
        type: 'output',
        runId: 'run-3',
        item: { id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 },
      },
    });
    child.emit('message', {
      type: 'result',
      result: {
        returnValue: 2,
        stream: [{ id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 }],
        logs: [{ level: 'info', message: 'ready', timestamp: '2026-04-28T00:00:00.000Z' }],
        errors: [],
        durationMs: 4,
      },
    });

    await expect(run).resolves.toMatchObject({ returnValue: 2 });
    expect(events).toEqual([
      expect.objectContaining({ type: 'log', runId: 'run-3' }),
      expect.objectContaining({ type: 'output', runId: 'run-3' }),
      expect.objectContaining({
        type: 'complete',
        runId: 'run-3',
        result: expect.objectContaining({ returnValue: 2 }),
      }),
    ]);
  });

  it('keeps emitting when a subscriber throws', async () => {
    const child = new FakeChildProcess();
    const events: unknown[] = [];
    const repo = new ProcessScriptRunnerRepository(
      {
        async resolveConnection(connectionId) {
          return connectionFor(connectionId);
        },
      },
      {
        forkWorker: vi.fn(() => child as unknown as ChildProcess),
        workerPath: '/worker.js',
      },
    );
    repo.subscribe(() => {
      throw new Error('listener failed');
    });
    repo.subscribe((event) => events.push(event));

    const run = repo.run({
      runId: 'run-4',
      connectionId: 'emu',
      source: 'yield 1; return 2;',
    });
    await Promise.resolve();

    expect(() => {
      child.emit('message', {
        type: 'event',
        event: {
          type: 'output',
          runId: 'run-4',
          item: { id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 },
        },
      });
    }).not.toThrow();
    child.emit('message', {
      type: 'result',
      result: {
        returnValue: 2,
        stream: [{ id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 }],
        logs: [],
        errors: [],
        durationMs: 4,
      },
    });

    await expect(run).resolves.toMatchObject({ returnValue: 2 });
    expect(events).toEqual([
      expect.objectContaining({ type: 'output', runId: 'run-4' }),
      expect.objectContaining({
        type: 'complete',
        runId: 'run-4',
        result: expect.objectContaining({ returnValue: 2 }),
      }),
    ]);
  });

  it('preserves partial worker events when the child exits unexpectedly', async () => {
    const child = new FakeChildProcess();
    const events: unknown[] = [];
    let now = 200;
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
    repo.subscribe((event) => events.push(event));

    const run = repo.run({
      runId: 'run-5',
      connectionId: 'emu',
      source: 'yield 1;',
    });
    await Promise.resolve();
    child.emit('message', {
      type: 'event',
      event: {
        type: 'log',
        runId: 'run-5',
        log: { level: 'info', message: 'before exit', timestamp: '2026-04-28T00:00:00.000Z' },
      },
    });
    child.emit('message', {
      type: 'event',
      event: {
        type: 'output',
        runId: 'run-5',
        item: { id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 },
      },
    });
    now = 229;
    child.emit('exit', 1, null);
    const result = await run;

    expect(result).toMatchObject({
      returnValue: null,
      stream: [{ id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 }],
      logs: [{ level: 'info', message: 'before exit', timestamp: '2026-04-28T00:00:00.000Z' }],
      durationMs: 29,
    });
    expect(result.errors[0]?.message).toContain('Script runner exited before completing');
    expect(events.at(-1)).toMatchObject({
      type: 'complete',
      runId: 'run-5',
      result: expect.objectContaining({ durationMs: 29 }),
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
