import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from './channels.ts';

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
});
