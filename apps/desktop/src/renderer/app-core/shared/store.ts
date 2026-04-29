export type AppCoreStoreListener = () => void;

export interface AppCoreStore<T> {
  get(): T;
  set(next: T): void;
  subscribe(listener: AppCoreStoreListener): () => void;
  update(updater: (current: T) => T): void;
}

export function createAppCoreStore<T>(initialState: T): AppCoreStore<T> {
  let state = initialState;
  const listeners = new Set<AppCoreStoreListener>();

  function notify() {
    for (const listener of listeners) listener();
  }

  return {
    get() {
      return state;
    },
    set(next) {
      state = next;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(updater) {
      state = updater(state);
      notify();
    },
  };
}
