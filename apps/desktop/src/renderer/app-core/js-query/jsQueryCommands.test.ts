import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  cancelJsQueryCommand,
  clearJsQueryTabCommand,
  type JsQueryCommandEnvironment,
  receiveJsQueryEventCommand,
  runJsQueryCommand,
} from './jsQueryCommands.ts';
import { createJsQueryStore } from './jsQueryStore.ts';

const successResult: ScriptRunResult = {
  durationMs: 7,
  errors: [],
  logs: [{ level: 'info', message: 'done', timestamp: '2026-01-01T00:00:00.000Z' }],
  returnValue: { ok: true },
  stream: [{ badge: 'object', id: 'yield-1', label: 'yield 1', value: { ok: true }, view: 'json' }],
};

describe('jsQueryCommands', () => {
  it('runs script, stores success, records interaction, and logs activity', async () => {
    const store = createJsQueryStore({ scripts: { 'tab-1': 'return 1;' } });
    const env = commandEnv({ runScript: vi.fn(async () => successResult) });

    const started = runJsQueryCommand(store, env, {
      commandOptions: { source: 'scheduler', visible: false },
      interactionPath: 'scripts/default',
      selectedTreeItemId: 'script:emu',
      source: 'return 1;',
      tab: { connectionId: 'emu', id: 'tab-1', kind: 'js-query' },
      tabIsCurrent: () => true,
    });
    await flushPromises();

    expect(started).toBe(true);
    expect(env.runScript).toHaveBeenCalledWith({
      connectionId: 'emu',
      runId: 'tab-1-2s-token',
      source: 'return 1;',
    });
    expect(env.recordInteraction).toHaveBeenCalledWith({
      activeTabId: 'tab-1',
      path: 'scripts/default',
      selectedTreeItemId: 'script:emu',
    });
    expect(store.get().results['tab-1']).toEqual(successResult);
    expect(env.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'Run JavaScript query',
        metadata: {
          command: expect.objectContaining({ source: 'scheduler', visible: false }),
          errorCount: 0,
          logCount: 1,
          outputCount: 1,
        },
        payload: { source: 'return 1;' },
        status: 'success',
      }),
    );
  });

  it('stores run failures and records failure activity', async () => {
    const error = new Error('boom');
    const env = commandEnv({ runScript: vi.fn(() => Promise.reject(error)) });
    const store = createJsQueryStore();

    runJsQueryCommand(store, env, {
      interactionPath: 'scripts/default',
      selectedTreeItemId: null,
      source: 'throw new Error();',
      tab: { connectionId: 'emu', id: 'tab-1', kind: 'js-query' },
      tabIsCurrent: () => true,
    });
    await flushPromises();

    expect(store.get().results['tab-1']?.errors[0]?.message).toBe('boom');
    expect(env.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'boom' }),
        status: 'failure',
        summary: 'JavaScript query failed with 1 error',
      }),
    );
  });

  it('records cancelled runs once and keeps partial output', async () => {
    const env = commandEnv({
      cancelScript: vi.fn(async () => {}),
      runScript: vi.fn(() => new Promise<ScriptRunResult>(() => {})),
    });
    const store = createJsQueryStore();

    runJsQueryCommand(store, env, {
      interactionPath: 'scripts/default',
      selectedTreeItemId: null,
      source: 'await wait();',
      tab: { connectionId: 'emu', id: 'tab-1', kind: 'js-query' },
      tabIsCurrent: () => true,
    });
    receiveJsQueryEventCommand(store, env, {
      event: {
        item: { badge: 'number', id: 'yield-1', label: 'yield 1', value: 1, view: 'json' },
        runId: 'tab-1-2s-token',
        type: 'output',
      },
      tabIsCurrent: () => true,
    });

    expect(cancelJsQueryCommand(store, env, {
      tab: { connectionId: 'emu', id: 'tab-1', kind: 'js-query' },
      tabExists: () => true,
    })).toBe(true);
    await flushPromises();

    expect(env.cancelScript).toHaveBeenCalledWith('tab-1-2s-token');
    expect(store.get().results['tab-1']).toMatchObject({
      cancelled: true,
      stream: [expect.objectContaining({ label: 'yield 1' })],
    });
    expect(env.recordActivity).toHaveBeenCalledTimes(1);
    expect(env.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Cancel JavaScript query', status: 'cancelled' }),
    );
  });

  it('ignores completed stale events and logs complete events once', () => {
    const env = commandEnv({ runScript: vi.fn(() => new Promise<ScriptRunResult>(() => {})) });
    const store = createJsQueryStore();

    runJsQueryCommand(store, env, {
      interactionPath: 'scripts/default',
      selectedTreeItemId: null,
      source: 'return 1;',
      tab: { connectionId: 'emu', id: 'tab-1', kind: 'js-query' },
      tabIsCurrent: () => true,
    });
    receiveJsQueryEventCommand(store, env, {
      event: { result: successResult, runId: 'old-run', type: 'complete' },
      tabIsCurrent: () => true,
    });
    expect(store.get().activeRuns['tab-1']).toBeDefined();
    expect(env.recordActivity).not.toHaveBeenCalled();

    receiveJsQueryEventCommand(store, env, {
      event: { result: successResult, runId: 'tab-1-2s-token', type: 'complete' },
      tabIsCurrent: () => true,
    });

    expect(store.get().activeRuns['tab-1']).toBeUndefined();
    expect(env.recordActivity).toHaveBeenCalledTimes(1);
  });

  it('clears a running tab and swallows cancel failures', async () => {
    const env = commandEnv({
      cancelScript: vi.fn(async () => Promise.reject(new Error('cancel failed'))),
      runScript: vi.fn(() => new Promise<ScriptRunResult>(() => {})),
    });
    const store = createJsQueryStore({ scripts: { 'tab-1': 'x' } });

    runJsQueryCommand(store, env, {
      interactionPath: 'scripts/default',
      selectedTreeItemId: null,
      source: 'x',
      tab: { connectionId: 'emu', id: 'tab-1', kind: 'js-query' },
      tabIsCurrent: () => true,
    });
    clearJsQueryTabCommand(store, env, 'tab-1');
    await flushPromises();

    expect(env.cancelScript).toHaveBeenCalledWith('tab-1-2s-token');
    expect(store.get().scripts['tab-1']).toBeUndefined();
    expect(store.get().results['tab-1']).toBeUndefined();
  });
});

function commandEnv(
  overrides: Partial<JsQueryCommandEnvironment> = {},
): JsQueryCommandEnvironment & {
  readonly recordActivity: ReturnType<typeof vi.fn>;
  readonly recordInteraction: ReturnType<typeof vi.fn>;
} {
  return {
    cancelScript: vi.fn(async () => {}),
    now: () => 100,
    randomToken: () => 'token',
    recordActivity: vi.fn(),
    recordInteraction: vi.fn(),
    runScript: vi.fn(async () => successResult),
    ...overrides,
  } as JsQueryCommandEnvironment & {
    readonly recordActivity: ReturnType<typeof vi.fn>;
    readonly recordInteraction: ReturnType<typeof vi.fn>;
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
