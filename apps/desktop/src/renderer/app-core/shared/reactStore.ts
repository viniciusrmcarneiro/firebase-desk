import { useSyncExternalStore } from 'react';
import type { AppCoreStore } from './store.ts';

export function useAppCoreStore<T>(store: AppCoreStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function useAppCoreSelector<T, Selected>(
  store: AppCoreStore<T>,
  selector: (state: T) => Selected,
): Selected {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get()),
  );
}
