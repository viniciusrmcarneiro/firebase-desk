import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (
    { count, estimateSize }: { count: number; estimateSize: (i: number) => number; },
  ) => {
    const size = count > 0 ? estimateSize(0) : 0;
    return {
      getTotalSize: () => count * size,
      getVirtualItems: () =>
        Array.from({ length: count }, (_, i) => ({ index: i, key: i, start: i * size, size })),
    };
  },
}));

import { JsonTreeView } from './JsonTreeView.tsx';

describe('JsonTreeView', () => {
  it('renders a single leaf for a primitive value', () => {
    render(
      <JsonTreeView value={42} expandedPaths={new Set()} onTogglePath={() => {}} />,
    );
    const items = screen.getAllByRole('treeitem');
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain('$: 42');
  });

  it('shows a collapsed object as a single node when its path is not expanded', () => {
    render(
      <JsonTreeView
        value={{ a: 1, b: 2 }}
        expandedPaths={new Set()}
        onTogglePath={() => {}}
      />,
    );
    const items = screen.getAllByRole('treeitem');
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain('{2}');
    expect(items[0]?.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands an object when its path is in expandedPaths', () => {
    render(
      <JsonTreeView
        value={{ a: 1, b: 'x' }}
        expandedPaths={new Set(['$'])}
        onTogglePath={() => {}}
      />,
    );
    const items = screen.getAllByRole('treeitem');
    expect(items).toHaveLength(3);
    expect(items[0]?.getAttribute('aria-expanded')).toBe('true');
    expect(items[1]?.textContent).toContain('$.a: 1');
    expect(items[2]?.textContent).toContain('$.b: "x"');
  });

  it('renders array length and expands children', () => {
    render(
      <JsonTreeView
        value={[10, 20]}
        expandedPaths={new Set(['$'])}
        onTogglePath={() => {}}
      />,
    );
    const items = screen.getAllByRole('treeitem');
    expect(items[0]?.textContent).toContain('[2]');
    expect(items[1]?.textContent).toContain('$.0: 10');
    expect(items[2]?.textContent).toContain('$.1: 20');
  });

  it('forwards toggle events to onTogglePath with the node path', () => {
    const onTogglePath = vi.fn();
    render(
      <JsonTreeView
        value={{ a: 1 }}
        expandedPaths={new Set()}
        onTogglePath={onTogglePath}
      />,
    );
    fireEvent.click(screen.getAllByRole('treeitem')[0]!);
    expect(onTogglePath).toHaveBeenCalledWith('$');
  });
});
