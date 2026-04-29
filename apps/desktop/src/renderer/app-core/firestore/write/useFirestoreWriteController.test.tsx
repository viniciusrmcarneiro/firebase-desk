// @vitest-environment jsdom

import type { FirestoreRepository, ProjectSummary } from '@firebase-desk/repo-contracts';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFirestoreWriteController } from './useFirestoreWriteController.ts';

describe('useFirestoreWriteController', () => {
  it('keeps failure statuses visible while rethrowing modal errors', async () => {
    const onStatus = vi.fn();
    const firestore = firestoreRepository({
      saveDocument: vi.fn().mockRejectedValue(new Error('denied')),
      updateDocumentFields: vi.fn().mockRejectedValue(new Error('stale')),
    });
    const { result } = renderHook(() =>
      useFirestoreWriteController({
        activeProject: project,
        activeTab: { id: 'tab_1', kind: 'firestore-query' },
        clearSelectedDocument: vi.fn(),
        dataMode: 'mock',
        firestore,
        invalidateFirestoreQueries: vi.fn(),
        onStatus,
        recordActivity: vi.fn(),
      })
    );

    let saveError: unknown;
    await act(async () => {
      try {
        await result.current.saveDocument('orders/ord_1', { status: 'paid' });
      } catch (error) {
        saveError = error;
      }
    });

    let updateError: unknown;
    await act(async () => {
      try {
        await result.current.updateDocumentFields(
          'orders/ord_1',
          [{ baseValue: 'draft', fieldPath: ['status'], type: 'set', value: 'paid' }],
          { staleBehavior: 'save-and-notify' },
        );
      } catch (error) {
        updateError = error;
      }
    });

    expect(saveError).toEqual(expect.any(Error));
    expect(updateError).toEqual(expect.any(Error));
    expect(onStatus).toHaveBeenCalledWith('Save failed: denied');
    expect(onStatus).toHaveBeenCalledWith('Update failed: stale');
  });
});

const project: ProjectSummary = {
  createdAt: '2026-04-27T00:00:00.000Z',
  credentialEncrypted: null,
  emulator: { authHost: '127.0.0.1:9099', firestoreHost: '127.0.0.1:8080' },
  hasCredential: false,
  id: 'emu',
  name: 'Local Emulator',
  projectId: 'demo-local',
  target: 'emulator',
};

function firestoreRepository(
  overrides: Partial<
    Pick<
      FirestoreRepository,
      | 'createDocument'
      | 'deleteDocument'
      | 'generateDocumentId'
      | 'saveDocument'
      | 'updateDocumentFields'
    >
  > = {},
) {
  return {
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
    generateDocumentId: vi.fn(),
    saveDocument: vi.fn(),
    updateDocumentFields: vi.fn(),
    ...overrides,
  } satisfies Pick<
    FirestoreRepository,
    | 'createDocument'
    | 'deleteDocument'
    | 'generateDocumentId'
    | 'saveDocument'
    | 'updateDocumentFields'
  >;
}
