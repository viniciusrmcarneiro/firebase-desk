import { type AppCoreStore, createAppCoreStore } from '../shared/store.ts';
import { type AuthRuntimeState, createInitialAuthRuntimeState } from './authState.ts';

export type AuthStore = AppCoreStore<AuthRuntimeState>;

export function createAuthStore(input: { readonly filter?: string | undefined; } = {}): AuthStore {
  return createAppCoreStore(createInitialAuthRuntimeState(input));
}
