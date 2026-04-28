import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from './channels.ts';
import { SCRIPT_RUN_EVENT_CHANNEL, ScriptRunEventSchema } from './script-runner.ts';

describe('script runner IPC schemas', () => {
  it('validates run requests and cancelled results', () => {
    expect(IPC_CHANNELS['scriptRunner.run'].request.parse({
      runId: 'run-1',
      connectionId: 'emu',
      source: 'return 1;',
    })).toEqual({
      runId: 'run-1',
      connectionId: 'emu',
      source: 'return 1;',
    });
    expect(IPC_CHANNELS['scriptRunner.run'].response.parse({
      returnValue: null,
      stream: [],
      logs: [{ level: 'info', message: 'Script cancelled', timestamp: '2026-04-28T00:00:00.000Z' }],
      errors: [],
      durationMs: 3,
      cancelled: true,
    })).toMatchObject({ cancelled: true });
  });

  it('validates cancel requests', () => {
    expect(IPC_CHANNELS['scriptRunner.cancel'].request.parse({ runId: 'run-1' })).toEqual({
      runId: 'run-1',
    });
    expect(() => IPC_CHANNELS['scriptRunner.cancel'].request.parse({})).toThrow();
  });

  it('validates live run events', () => {
    expect(SCRIPT_RUN_EVENT_CHANNEL).toBe('scriptRunner.event');
    expect(ScriptRunEventSchema.parse({
      type: 'output',
      runId: 'run-1',
      item: {
        id: 'yield-1',
        label: 'yield 1',
        badge: 'number',
        view: 'json',
        value: 1,
      },
    })).toMatchObject({ type: 'output', runId: 'run-1' });
    expect(ScriptRunEventSchema.parse({
      type: 'log',
      runId: 'run-1',
      log: { level: 'info', message: 'ready', timestamp: '2026-04-28T00:00:00.000Z' },
    })).toMatchObject({ type: 'log' });
    expect(ScriptRunEventSchema.parse({
      type: 'error',
      runId: 'run-1',
      error: { name: 'Error', message: 'failed' },
    })).toMatchObject({ type: 'error' });
    expect(ScriptRunEventSchema.parse({
      type: 'complete',
      runId: 'run-1',
      result: { returnValue: null, stream: [], logs: [], errors: [], durationMs: 1 },
    })).toMatchObject({ type: 'complete' });
  });
});
