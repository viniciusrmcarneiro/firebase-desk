import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import { FirestoreCursorCache } from './cursor-cache.ts';

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
});
