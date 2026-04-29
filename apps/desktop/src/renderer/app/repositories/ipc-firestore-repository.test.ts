import { describe, expect, it, vi } from 'vitest';
import { IpcFirestoreRepository } from './ipc-firestore-repository.ts';

describe('IpcFirestoreRepository', () => {
  it('normalizes Firestore read responses from IPC', async () => {
    const firestore = {
      listRootCollections: vi.fn().mockResolvedValue([{ id: 'orders', path: 'orders' }]),
      listDocuments: vi.fn().mockResolvedValue({
        items: [{ id: 'ord_1', path: 'orders/ord_1', hasSubcollections: true }],
        nextCursor: { token: 'cursor-1' },
      }),
      listSubcollections: vi.fn().mockResolvedValue([{
        id: 'events',
        path: 'orders/ord_1/events',
      }]),
      runQuery: vi.fn().mockResolvedValue({
        items: [{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: { status: 'paid' },
          hasSubcollections: true,
          subcollections: [{ id: 'events', path: 'orders/ord_1/events' }],
        }],
        nextCursor: null,
      }),
      getDocument: vi.fn().mockResolvedValue({
        id: 'ord_1',
        path: 'orders/ord_1',
        data: { status: 'paid' },
        hasSubcollections: false,
      }),
      saveDocument: vi.fn().mockResolvedValue({
        id: 'ord_2',
        path: 'orders/ord_2',
        data: { status: 'draft' },
        hasSubcollections: false,
      }),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
    } satisfies Partial<DesktopFirestoreApi>;
    Object.defineProperty(window, 'firebaseDesk', {
      configurable: true,
      value: { firestore },
    });
    const repository = new IpcFirestoreRepository();

    await expect(repository.listRootCollections('emu')).resolves.toEqual([{
      id: 'orders',
      path: 'orders',
    }]);
    await expect(repository.listDocuments('emu', 'orders', { limit: 1 })).resolves.toEqual({
      items: [{ id: 'ord_1', path: 'orders/ord_1', hasSubcollections: true }],
      nextCursor: { token: 'cursor-1' },
    });
    await expect(repository.listSubcollections('emu', 'orders/ord_1')).resolves.toEqual([
      { id: 'events', path: 'orders/ord_1/events' },
    ]);
    await expect(repository.runQuery({
      connectionId: 'emu',
      path: 'orders',
      filters: [{ field: 'status', op: '==', value: 'paid' }],
    })).resolves.toEqual({
      items: [{
        id: 'ord_1',
        path: 'orders/ord_1',
        data: { status: 'paid' },
        hasSubcollections: true,
        subcollections: [{ id: 'events', path: 'orders/ord_1/events' }],
      }],
      nextCursor: null,
    });
    await expect(repository.getDocument('emu', 'orders/ord_1')).resolves.toEqual({
      id: 'ord_1',
      path: 'orders/ord_1',
      data: { status: 'paid' },
      hasSubcollections: false,
    });
    await expect(repository.saveDocument('emu', 'orders/ord_2', {
      status: 'draft',
    })).resolves.toEqual({
      id: 'ord_2',
      path: 'orders/ord_2',
      data: { status: 'draft' },
      hasSubcollections: false,
    });
    await expect(repository.deleteDocument('emu', 'orders/ord_2', {
      deleteSubcollectionPaths: ['orders/ord_2/events'],
    })).resolves.toBeUndefined();

    expect(firestore.listDocuments).toHaveBeenCalledWith({
      collectionPath: 'orders',
      connectionId: 'emu',
      request: { limit: 1 },
    });
    expect(firestore.runQuery).toHaveBeenCalledWith({
      query: {
        connectionId: 'emu',
        path: 'orders',
        filters: [{ field: 'status', op: '==', value: 'paid' }],
      },
    });
    expect(firestore.saveDocument).toHaveBeenCalledWith({
      connectionId: 'emu',
      documentPath: 'orders/ord_2',
      data: { status: 'draft' },
    });
    expect(firestore.deleteDocument).toHaveBeenCalledWith({
      connectionId: 'emu',
      documentPath: 'orders/ord_2',
      options: { deleteSubcollectionPaths: ['orders/ord_2/events'] },
    });
  });
});
