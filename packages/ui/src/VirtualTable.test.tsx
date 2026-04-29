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

import { VirtualTable, type VirtualTableColumn } from './VirtualTable.tsx';

interface User {
  id: string;
  name: string;
  age: number;
}

const rows: User[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Linus', age: 54 },
];

const columns: VirtualTableColumn<User>[] = [
  { id: 'name', header: 'Name', cell: (r) => <span data-testid='name-cell'>{r.name}</span> },
  { id: 'age', header: 'Age', cell: (r) => <span data-testid='age-cell'>{r.age}</span>, width: 80 },
];

describe('VirtualTable', () => {
  it('renders headers and one cell per column per row', () => {
    render(<VirtualTable rows={rows} columns={columns} rowHeight={24} />);
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Age')).toBeDefined();
    expect(screen.getAllByTestId('name-cell').map((c) => c.textContent)).toEqual(['Ada', 'Linus']);
    expect(screen.getAllByTestId('age-cell').map((c) => c.textContent)).toEqual(['36', '54']);
  });

  it('renders only header row when there are no rows', () => {
    render(<VirtualTable rows={[]} columns={columns} rowHeight={24} />);
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.queryAllByTestId('name-cell')).toHaveLength(0);
  });

  it('sizes the sticky header to the full table width', () => {
    render(
      <VirtualTable
        rows={rows}
        columns={[
          { ...columns[0]!, width: 120 },
          { ...columns[1]!, width: 80 },
        ]}
        enableColumnResize
        rowHeight={24}
      />,
    );

    const header = screen.getByText('Name').parentElement?.parentElement;
    expect(header?.style.width).toBe('200px');
    expect(screen.getByRole('separator', { name: 'Resize Name' }).className).toContain(
      'before:bg-border-subtle',
    );
  });

  it('uses column id for resize labels when headers are not text', () => {
    render(
      <VirtualTable
        rows={rows}
        columns={[
          { id: 'displayName', header: <span>Name</span>, cell: (r) => r.name, width: 120 },
        ]}
        enableColumnResize
        rowHeight={24}
      />,
    );

    expect(screen.getByRole('separator', { name: 'Resize displayName' })).toBeDefined();
  });
});
