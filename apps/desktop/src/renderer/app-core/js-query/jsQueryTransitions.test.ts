import type { ScriptRunEvent, ScriptRunResult } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import { createInitialJsQueryState } from './jsQueryState.ts';
import {
  jsQueryEventReceived,
  jsQueryRunCancelled,
  jsQueryRunStarted,
  jsQuerySourceChanged,
  jsQueryTabCleared,
} from './jsQueryTransitions.ts';

const result: ScriptRunResult = {
  durationMs: 5,
  errors: [],
  logs: [],
  returnValue: { ok: true },
};

describe('jsQueryTransitions', () => {
  it('tracks script source by tab', () => {
    const state = jsQuerySourceChanged(createInitialJsQueryState(), 'tab-1', 'return 1;');

    expect(state.scripts).toEqual({ 'tab-1': 'return 1;' });
  });

  it('starts a run and clears the previous result for that tab', () => {
    const state = jsQueryRunStarted(
      { ...createInitialJsQueryState(), results: { 'tab-1': result } },
      {
        connectionId: 'emu',
        runId: 'run-1',
        source: 'return 1;',
        startedAt: 100,
        tabId: 'tab-1',
      },
    );

    expect(state.results['tab-1']).toBeUndefined();
    expect(state.runIds['tab-1']).toBe('run-1');
    expect(state.activeRuns['tab-1']).toMatchObject({ connectionId: 'emu', startedAt: 100 });
  });

  it('merges live output into the running result', () => {
    const running = jsQueryRunStarted(createInitialJsQueryState(), {
      connectionId: 'emu',
      runId: 'run-1',
      source: 'return 1;',
      startedAt: 100,
      tabId: 'tab-1',
    });
    const event: ScriptRunEvent = {
      item: { badge: 'number', id: 'yield-1', label: 'yield 1', value: 1, view: 'json' },
      runId: 'run-1',
      type: 'output',
    };

    const state = jsQueryEventReceived(running, {
      event,
      now: 125,
      tabIsCurrent: () => true,
    });

    expect(state.results['tab-1']?.durationMs).toBe(25);
    expect(state.results['tab-1']?.stream).toEqual([
      expect.objectContaining({ label: 'yield 1', value: 1 }),
    ]);
  });

  it('ignores stale events', () => {
    const running = jsQueryRunStarted(createInitialJsQueryState(), {
      connectionId: 'emu',
      runId: 'run-1',
      source: 'return 1;',
      startedAt: 100,
      tabId: 'tab-1',
    });

    const state = jsQueryEventReceived(running, {
      event: {
        item: { badge: 'number', id: 'yield-1', label: 'stale', value: 1, view: 'json' },
        runId: 'old-run',
        type: 'output',
      },
      now: 125,
      tabIsCurrent: () => true,
    });

    expect(state).toBe(running);
  });

  it('keeps partial output when cancelling', () => {
    const running = jsQueryEventReceived(
      jsQueryRunStarted(createInitialJsQueryState(), {
        connectionId: 'emu',
        runId: 'run-1',
        source: 'return 1;',
        startedAt: 100,
        tabId: 'tab-1',
      }),
      {
        event: {
          item: { badge: 'number', id: 'yield-1', label: 'yield 1', value: 1, view: 'json' },
          runId: 'run-1',
          type: 'output',
        },
        now: 110,
        tabIsCurrent: () => true,
      },
    );

    const state = jsQueryRunCancelled(running, 'tab-1', 130);

    expect(state.activeRuns['tab-1']).toBeUndefined();
    expect(state.results['tab-1']).toMatchObject({
      cancelled: true,
      durationMs: 30,
      stream: [expect.objectContaining({ label: 'yield 1' })],
    });
  });

  it('clears tab-owned script state', () => {
    const running = jsQueryRunStarted(createInitialJsQueryState({ scripts: { 'tab-1': 'x' } }), {
      connectionId: 'emu',
      runId: 'run-1',
      source: 'x',
      startedAt: 100,
      tabId: 'tab-1',
    });

    const state = jsQueryTabCleared(running, 'tab-1');

    expect(state.activeRuns['tab-1']).toBeUndefined();
    expect(state.runIds['tab-1']).toBeUndefined();
    expect(state.scripts['tab-1']).toBeUndefined();
  });
});
