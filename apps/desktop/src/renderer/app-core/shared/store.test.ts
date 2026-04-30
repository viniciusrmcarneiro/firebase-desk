import { describe, expect, it, vi } from 'vitest';
import { createAppCoreStore } from './store.ts';

describe('createAppCoreStore', () => {
  it('gets, sets, updates, and notifies subscribers', () => {
    const store = createAppCoreStore({ count: 1 });
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    store.set({ count: 2 });
    store.update((state) => ({ count: state.count + 1 }));

    expect(store.get()).toEqual({ count: 3 });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.set({ count: 4 });

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
