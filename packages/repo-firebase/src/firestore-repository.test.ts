import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import type { Firestore } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import type { AdminFirestoreProvider } from './admin-firestore-provider.ts';
import { FirebaseFirestoreRepository } from './firestore-repository.ts';

describe('FirebaseFirestoreRepository', () => {
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
