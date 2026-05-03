import type { BackgroundJob } from '@firebase-desk/repo-contracts/jobs';
import type { AdminFirestoreProvider } from '@firebase-desk/repo-firebase';
import { describe, expect, it, vi } from 'vitest';
import { FirestoreCollectionJobRunner } from './firestore-collection-job-runner.ts';

describe('FirestoreCollectionJobRunner', () => {
  it('deletes through paged reads and 500-operation batches', async () => {
    const db = new FakeFirestore({
      orders: Array.from(
        { length: 501 },
        (_, index) => `orders/order_${String(index).padStart(3, '0')}`,
      ),
    });
    const runner = new FirestoreCollectionJobRunner(provider(db), { tempDirectory: '/tmp' });
    const progress = vi.fn();

    await runner.run(deleteJob(false), neverCancelled(), { update: progress });

    expect(db.reads).toEqual([
      { path: 'orders', startAfter: null },
      { path: 'orders', startAfter: 'orders/order_249' },
      { path: 'orders', startAfter: 'orders/order_499' },
    ]);
    expect(db.commits.map((commit) => commit.length)).toEqual([500, 1]);
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({
      currentPath: undefined,
      deleted: 501,
      read: 501,
    }));
  });

  it('deletes recursive subcollections before parent documents', async () => {
    const db = new FakeFirestore({
      'orders': ['orders/order_1'],
      'orders/order_1/items': ['orders/order_1/items/item_1'],
    });
    const runner = new FirestoreCollectionJobRunner(provider(db), { tempDirectory: '/tmp' });

    await runner.run(deleteJob(true), neverCancelled(), { update: vi.fn() });

    expect(db.commits.flat()).toEqual([
      'orders/order_1/items/item_1',
      'orders/order_1',
    ]);
  });
});

class FakeFirestore {
  readonly commits: string[][] = [];
  readonly reads: Array<{ readonly path: string; readonly startAfter: string | null; }> = [];

  constructor(private readonly docsByCollection: Record<string, string[]>) {}

  batch() {
    const paths: string[] = [];
    return {
      commit: async () => {
        this.commits.push([...paths]);
      },
      delete: (ref: { readonly path: string; }) => {
        paths.push(ref.path);
      },
      set: (ref: { readonly path: string; }) => {
        paths.push(ref.path);
      },
    };
  }

  collection(path: string) {
    return new FakeQuery(this, path);
  }

  doc(path: string) {
    return { path };
  }

  documents(path: string, startAfter: string | null, limit: number): FakeSnapshot[] {
    this.reads.push({ path, startAfter });
    const paths = this.docsByCollection[path] ?? [];
    const startIndex = startAfter ? paths.indexOf(startAfter) + 1 : 0;
    return paths.slice(startIndex, startIndex + limit).map((docPath) =>
      new FakeSnapshot(this, docPath)
    );
  }

  subcollections(documentPath: string): Array<{ readonly path: string; }> {
    const prefix = `${documentPath}/`;
    return Object.keys(this.docsByCollection)
      .filter((path) =>
        path.startsWith(prefix) && path.slice(prefix.length).split('/').length === 1
      )
      .map((path) => ({ path }));
  }
}

class FakeQuery {
  private limitValue = 250;
  private startAfterPath: string | null = null;

  constructor(
    private readonly db: FakeFirestore,
    private readonly path: string,
  ) {}

  orderBy() {
    return this;
  }

  limit(limit: number) {
    this.limitValue = limit;
    return this;
  }

  startAfter(doc: { readonly ref: { readonly path: string; }; }) {
    this.startAfterPath = doc.ref.path;
    return this;
  }

  async get() {
    const docs = this.db.documents(this.path, this.startAfterPath, this.limitValue);
    return { docs, empty: docs.length === 0 };
  }
}

class FakeSnapshot {
  readonly ref: {
    readonly path: string;
    readonly listCollections: () => Promise<Array<{ readonly path: string; }>>;
  };

  constructor(
    db: FakeFirestore,
    path: string,
  ) {
    this.ref = {
      listCollections: async () => db.subcollections(path),
      path,
    };
  }

  data() {
    return {};
  }
}

function provider(db: FakeFirestore): AdminFirestoreProvider {
  return {
    getFirestoreConnection: async () => ({ db }),
  } as unknown as AdminFirestoreProvider;
}

function deleteJob(includeSubcollections: boolean): BackgroundJob {
  return {
    createdAt: '2026-04-29T00:00:00.000Z',
    id: 'job-1',
    progress: { deleted: 0, failed: 0, read: 0, skipped: 0, written: 0 },
    request: {
      collectionPath: 'orders',
      connectionId: 'emu',
      includeSubcollections,
      type: 'firestore.deleteCollection',
    },
    status: 'running',
    title: 'Delete collection',
    type: 'firestore.deleteCollection',
    updatedAt: '2026-04-29T00:00:00.000Z',
  };
}

function neverCancelled() {
  return { isCancelled: () => false };
}
