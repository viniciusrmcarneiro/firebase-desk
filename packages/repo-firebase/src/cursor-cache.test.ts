import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FirestoreCursorCache } from './cursor-cache.ts';

afterEach(() => {
  vi.useRealTimers();
});

describe('FirestoreCursorCache', () => {
  it('returns cached snapshots only for the matching connection', () => {
    const cache = new FirestoreCursorCache();
    const snapshot = { id: 'doc-1' } as QueryDocumentSnapshot;
    const token = cache.create('connection-a', snapshot);

    expect(cache.get('connection-b', token)).toBeNull();
    expect(cache.get('connection-a', token)).toBe(snapshot);
  });

  it('invalidates connection-specific cursors', () => {
    const cache = new FirestoreCursorCache();
    const snapshotA = { id: 'doc-a' } as QueryDocumentSnapshot;
    const snapshotB = { id: 'doc-b' } as QueryDocumentSnapshot;
    const tokenA = cache.create('connection-a', snapshotA);
    const tokenB = cache.create('connection-b', snapshotB);

    cache.invalidateConnection('connection-a');

    expect(cache.get('connection-a', tokenA)).toBeNull();
    expect(cache.get('connection-b', tokenB)).toBe(snapshotB);
  });

  it('expires old cursors', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T00:00:00.000Z'));
    const cache = new FirestoreCursorCache({ ttlMs: 10 });
    const snapshot = { id: 'doc-1' } as QueryDocumentSnapshot;
    const token = cache.create('connection-a', snapshot);

    vi.setSystemTime(new Date('2026-04-30T00:00:00.011Z'));

    expect(cache.get('connection-a', token)).toBeNull();
  });
});
