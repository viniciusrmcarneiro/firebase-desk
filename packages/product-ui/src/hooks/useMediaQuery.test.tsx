import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery.ts';

function Probe({ query }: { readonly query: string; }) {
  const matches = useMediaQuery(query);
  return <div>{matches ? 'wide' : 'narrow'}</div>;
}

describe('useMediaQuery', () => {
  it('tracks media query changes', () => {
    let matches = false;
    let listener: ((event: { readonly matches: boolean; }) => void) | null = null;
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return matches;
        },
        addEventListener: vi.fn((_type, nextListener) => {
          listener = nextListener;
        }),
        removeEventListener: vi.fn(),
      })),
    );

    render(<Probe query='(min-width: 900px)' />);

    expect(screen.getByText('narrow')).toBeTruthy();
    matches = true;
    act(() => listener?.({ matches: true }));
    expect(screen.getByText('wide')).toBeTruthy();
  });
});
