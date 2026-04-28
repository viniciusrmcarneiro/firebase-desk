import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import {
  firestoreDocumentsFromValue,
  formatLogEntry,
  queryPathForRows,
  streamItemsFor,
  toFirebaseError,
} from './scriptResultModel.ts';

describe('scriptResultModel', () => {
  it('maps normalized document values to Firestore browser rows', () => {
    const rows = firestoreDocumentsFromValue([
      {
        id: 'ord_1',
        path: 'orders/ord_1',
        data: { total: 10 },
        subcollections: [{ id: 'events', path: 'orders/ord_1/events' }],
      },
      { id: 'ignored' },
    ]);

    expect(rows).toEqual([
      {
        id: 'ord_1',
        path: 'orders/ord_1',
        data: { total: 10 },
        hasSubcollections: true,
        subcollections: [{ id: 'events', path: 'orders/ord_1/events' }],
      },
    ]);
    expect(queryPathForRows(rows)).toBe('orders');
  });

  it('uses return value as a stream item only when explicit stream is empty', () => {
    const result: ScriptRunResult = {
      returnValue: { ok: true },
      stream: [],
      logs: [],
      errors: [],
      durationMs: 1,
    };

    expect(streamItemsFor(result)).toEqual([
      {
        id: 'return-value',
        label: 'return value',
        badge: 'Object(1)',
        view: 'json',
        value: { ok: true },
      },
    ]);
    expect(streamItemsFor({ ...result, errors: [{ message: 'nope' }] })).toEqual([]);
  });

  it('keeps partial stream output visible when a run has errors', () => {
    const result: ScriptRunResult = {
      returnValue: null,
      stream: [{ id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 }],
      logs: [],
      errors: [{ message: 'boom' }],
      durationMs: 1,
    };

    expect(streamItemsFor(result)).toEqual([
      { id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 },
    ]);
  });

  it('formats log and error values for preview', () => {
    expect(formatLogEntry({
      level: 'info',
      message: 'done',
      timestamp: '2026-04-28T01:02:03.000Z',
    })).toBe('[01:02:03] done');
    expect(toFirebaseError({ code: 'permission-denied', message: 'no' })).toEqual({
      code: 'permission-denied',
      message: 'no',
      name: 'Error',
    });
  });
});
