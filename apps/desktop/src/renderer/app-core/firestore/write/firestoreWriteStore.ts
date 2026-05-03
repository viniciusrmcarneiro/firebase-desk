import { type AppCoreStore, createAppCoreStore } from '../../shared/store.ts';
import {
  createInitialFirestoreWriteState,
  type FirestoreWriteState,
} from './firestoreWriteState.ts';

export type FirestoreWriteStore = AppCoreStore<FirestoreWriteState>;

export function createFirestoreWriteStore(
  initialState: FirestoreWriteState = createInitialFirestoreWriteState(),
): FirestoreWriteStore {
  return createAppCoreStore(initialState);
}
