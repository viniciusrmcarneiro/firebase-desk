import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import { DocumentReference, type Firestore, GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it, vi } from 'vitest';
import type { AdminFirestoreProvider } from './admin-firestore-provider.ts';
import { FirebaseFirestoreRepository } from './firestore-repository.ts';

describe('FirebaseFirestoreRepository', () => {
  it('saves decoded Firestore values and returns an encoded document', async () => {
    let savedData: Record<string, unknown> | null = null;
    const targetRef = fakeDocumentReference('orders/ord_1', {
      getData: () => savedData ?? {},
      onSet: (data) => {
        savedData = data;
      },
    });
    const customerRef = fakeDocumentReference('customers/cust_1');
    const db = {
      doc: vi.fn((path: string) => path === 'orders/ord_1' ? targetRef : customerRef),
    } as unknown as Firestore;
    const repository = new FirebaseFirestoreRepository(providerFor(db));

    const saved = await repository.saveDocument('test', 'orders/ord_1', {
      createdAt: { __type__: 'timestamp', value: '2026-04-29T00:00:00.000Z' },
      location: { __type__: 'geoPoint', latitude: -37.8136, longitude: 144.9631 },
      receipt: { __type__: 'bytes', base64: 'dGVzdA==' },
      customer: { __type__: 'reference', path: 'customers/cust_1' },
    });

    expect(savedData?.['createdAt']).toBeInstanceOf(Timestamp);
    expect(savedData?.['location']).toBeInstanceOf(GeoPoint);
    expect(Buffer.isBuffer(savedData?.['receipt'])).toBe(true);
    expect(savedData?.['customer']).toBe(customerRef);
    expect(saved.data).toMatchObject({
      createdAt: { __type__: 'timestamp', value: '2026-04-29T00:00:00.000Z' },
      location: { __type__: 'geoPoint', latitude: -37.8136, longitude: 144.9631 },
      receipt: { __type__: 'bytes', base64: 'dGVzdA==' },
      customer: { __type__: 'reference', path: 'customers/cust_1' },
    });
  });

  it('recursively deletes selected subcollections before deleting the parent document', async () => {
    const parentDelete = vi.fn();
    const parentRef = fakeDocumentReference('orders/ord_1', { onDelete: parentDelete });
    const recursiveDelete = vi.fn();
    const db = {
      collection: vi.fn((path: string) => ({ path })),
      doc: vi.fn(() => parentRef),
      recursiveDelete,
    } as unknown as Firestore;
    const repository = new FirebaseFirestoreRepository(providerFor(db));

    await repository.deleteDocument('test', 'orders/ord_1', {
      deleteSubcollectionPaths: ['orders/ord_1/events'],
    });

    expect(recursiveDelete).toHaveBeenCalledWith({ path: 'orders/ord_1/events' });
    expect(parentDelete).toHaveBeenCalledTimes(1);
    expect(recursiveDelete.mock.invocationCallOrder[0]).toBeLessThan(
      parentDelete.mock.invocationCallOrder[0]!,
    );
  });

  it('does not delete the parent document when recursive subcollection delete fails', async () => {
    const parentDelete = vi.fn();
    const parentRef = fakeDocumentReference('orders/ord_1', { onDelete: parentDelete });
    const recursiveDelete = vi.fn(async () => {
      throw new Error('recursive delete failed');
    });
    const db = {
      collection: vi.fn((path: string) => ({ path })),
      doc: vi.fn(() => parentRef),
      recursiveDelete,
    } as unknown as Firestore;
    const repository = new FirebaseFirestoreRepository(providerFor(db));

    await expect(repository.deleteDocument('test', 'orders/ord_1', {
      deleteSubcollectionPaths: ['orders/ord_1/events'],
    })).rejects.toThrow('recursive delete failed');

    expect(parentDelete).not.toHaveBeenCalled();
  });

  it('rejects invalid write and delete paths', async () => {
    const repository = new FirebaseFirestoreRepository(providerFor({} as Firestore));

    await expect(repository.saveDocument('test', 'orders', {})).rejects.toThrow(
      'Invalid Firestore document path',
    );
    await expect(repository.deleteDocument('test', 'orders/ord_1', {
      deleteSubcollectionPaths: ['orders/ord_2/events'],
    })).rejects.toThrow('Invalid Firestore subcollection path');
  });

  it('surfaces emulator connection failures as actionable errors', async () => {
    const repository = new FirebaseFirestoreRepository({
      getFirestoreConnection: async () => ({
        config: { project: emulatorProject(), credentialJson: null },
        db: {
          listCollections: async () => {
            const error = new Error('14 UNAVAILABLE: No connection established');
            (error as Error & { code?: number; }).code = 14;
            throw error;
          },
        } as unknown as Firestore,
      }),
    } as unknown as AdminFirestoreProvider);

    await expect(repository.listRootCollections('test')).rejects.toThrow(
      'Firestore emulator is not reachable at 127.0.0.1:8080.',
    );
  });
});

function providerFor(db: Firestore): AdminFirestoreProvider {
  return {
    getFirestoreConnection: async () => ({
      config: { project: emulatorProject(), credentialJson: null },
      db,
    }),
  } as unknown as AdminFirestoreProvider;
}

function fakeDocumentReference(
  path: string,
  options: {
    readonly getData?: (() => Record<string, unknown>) | undefined;
    readonly onDelete?: (() => void | Promise<void>) | undefined;
    readonly onSet?: ((data: Record<string, unknown>) => void | Promise<void>) | undefined;
  } = {},
): DocumentReference {
  const id = path.split('/').at(-1) ?? path;
  const ref = Object.create(DocumentReference.prototype) as DocumentReference;
  Object.defineProperties(ref, {
    delete: {
      value: async () => {
        await options.onDelete?.();
      },
    },
    get: {
      value: async () => ({
        data: () => options.getData?.() ?? {},
        exists: true,
        id,
        ref: fakeDocumentReference(path),
      }),
    },
    id: { value: id },
    listCollections: { value: async () => [] },
    path: { value: path },
    set: {
      value: async (data: Record<string, unknown>) => {
        await options.onSet?.(data);
      },
    },
  });
  return ref;
}

function emulatorProject(): ProjectSummary {
  return {
    id: 'test',
    name: 'Test Emulator',
    projectId: 'demo-firebase-lite',
    target: 'emulator',
    emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
    hasCredential: false,
    credentialEncrypted: null,
    createdAt: '2026-04-28T00:00:00.000Z',
  };
}
