import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAppCoreStore } from './reactStore.ts';
import { createAppCoreStore } from './store.ts';

describe('useAppCoreStore', () => {
  it('renders the current state and updates through subscriptions', () => {
    const store = createAppCoreStore({ label: 'Ready' });

    render(<StoreValue store={store} />);
    expect(screen.getByText('Ready')).toBeTruthy();

    act(() => store.update(() => ({ label: 'Updated' })));

    expect(screen.getByText('Updated')).toBeTruthy();
  });
});

function StoreValue(
  { store }: { readonly store: ReturnType<typeof createAppCoreStore<{ label: string; }>>; },
) {
  const state = useAppCoreStore(store);
  return <div>{state.label}</div>;
}
