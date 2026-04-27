import { render, screen } from '@testing-library/react';
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

import { VirtualList } from './VirtualList.tsx';

describe('VirtualList', () => {
  it('renders every item via renderItem', () => {
    render(
      <VirtualList
        items={['a', 'b', 'c']}
        estimateSize={() => 20}
        renderItem={(item) => <span data-testid='row'>{item}</span>}
      />,
    );
    const rows = screen.getAllByTestId('row');
    expect(rows.map((r) => r.textContent)).toEqual(['a', 'b', 'c']);
  });

  it('passes the index to renderItem', () => {
    render(
      <VirtualList
        items={['x', 'y']}
        estimateSize={() => 20}
        renderItem={(item, index) => <span data-testid='row'>{`${index}:${item}`}</span>}
      />,
    );
    expect(screen.getAllByTestId('row').map((r) => r.textContent)).toEqual(['0:x', '1:y']);
  });

  it('applies container and item classes', () => {
    const { container } = render(
      <VirtualList
        className='outer-list'
        itemClassName={(item) => `row-${item}`}
        items={['x']}
        estimateSize={() => 20}
        renderItem={(item) => <span>{item}</span>}
      />,
    );

    expect(container.querySelector('.outer-list')).toBeTruthy();
    expect(container.querySelector('.row-x')).toBeTruthy();
  });

  it('renders nothing for an empty list', () => {
    render(
      <VirtualList
        items={[]}
        estimateSize={() => 20}
        renderItem={(item) => <span data-testid='row'>{String(item)}</span>}
      />,
    );
    expect(screen.queryAllByTestId('row')).toHaveLength(0);
  });
});
