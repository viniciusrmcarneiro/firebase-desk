import { createEvent, fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('grid').getAttribute('aria-colcount')).toBe('2');
    expect(screen.getByRole('grid').getAttribute('aria-rowcount')).toBe('3');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Age' })).toBeDefined();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByRole('gridcell')).toHaveLength(4);
    expect(screen.getAllByTestId('name-cell').map((c) => c.textContent)).toEqual(['Ada', 'Linus']);
    expect(screen.getAllByTestId('age-cell').map((c) => c.textContent)).toEqual(['36', '54']);
  });

  it('renders only header row when there are no rows', () => {
    render(<VirtualTable rows={[]} columns={columns} rowHeight={24} />);
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.queryAllByTestId('name-cell')).toHaveLength(0);
  });

  it('uses density row height when row height is not provided', () => {
    render(<VirtualTable density='comfortable' rows={rows} columns={columns} />);

    const dataRows = screen.getAllByRole('row').slice(1) as HTMLElement[];
    expect(dataRows[1]?.style.transform).toBe('translateY(36px)');
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

  it('activates rows with keyboard and moves focus between rows', () => {
    const onRowClick = vi.fn();
    render(
      <VirtualTable
        rows={rows}
        columns={columns}
        onRowClick={onRowClick}
        rowHeight={24}
      />,
    );

    const dataRows = screen.getAllByRole('row').slice(1) as HTMLElement[];
    dataRows[0]!.focus();
    fireEvent.keyDown(dataRows[0]!, { key: 'Enter' });
    fireEvent.keyDown(dataRows[0]!, { key: 'ArrowDown' });

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    expect(document.activeElement).toBe(dataRows[1]);
  });

  it('runs row click once for a real browser double-click sequence', () => {
    const onRowClick = vi.fn();
    render(
      <VirtualTable
        rows={rows}
        columns={columns}
        onRowClick={onRowClick}
        rowHeight={24}
      />,
    );

    const row = screen.getAllByRole('row')[1]!;
    fireEvent.click(row, { detail: 1 });
    fireEvent.click(row, { detail: 2 });
    fireEvent.doubleClick(row, { detail: 2 });

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('uses row click for double-click when no double-click action is provided', () => {
    const onRowClick = vi.fn();
    render(
      <VirtualTable
        rows={rows}
        columns={columns}
        onRowClick={onRowClick}
        rowHeight={24}
      />,
    );

    fireEvent.doubleClick(screen.getAllByRole('row')[1]!, { detail: 2 });

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('runs explicit row double-click once after the first row click', () => {
    const onRowClick = vi.fn();
    const onRowDoubleClick = vi.fn();
    render(
      <VirtualTable
        rows={rows}
        columns={columns}
        onRowClick={onRowClick}
        onRowDoubleClick={onRowDoubleClick}
        rowHeight={24}
      />,
    );

    const row = screen.getAllByRole('row')[1]!;
    fireEvent.click(row, { detail: 1 });
    fireEvent.click(row, { detail: 2 });
    fireEvent.doubleClick(row, { detail: 2 });

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowDoubleClick).toHaveBeenCalledWith(rows[0]);
    expect(onRowDoubleClick).toHaveBeenCalledTimes(1);
  });

  it('keeps native double-click behavior when no row action is provided', () => {
    render(<VirtualTable rows={rows} columns={columns} rowHeight={24} />);

    const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2 });
    fireEvent(screen.getAllByRole('row')[1]!, event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('prevents repeated mouse down from selecting row text', () => {
    render(<VirtualTable rows={rows} columns={columns} rowHeight={24} />);

    const row = screen.getAllByRole('row')[1]!;
    const event = createEvent.mouseDown(row, { detail: 2 });
    fireEvent(row, event);

    expect(event.defaultPrevented).toBe(true);
  });
});
