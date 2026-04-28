import { fireEvent, render, screen } from '@testing-library/react';
import { FileText } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { ExplorerTree, type ExplorerTreeRowModel } from './ExplorerTree.tsx';

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

const rows: ReadonlyArray<ExplorerTreeRowModel> = [
  {
    id: 'doc:one',
    icon: <FileText size={14} aria-hidden='true' />,
    label: 'one',
    level: 0,
    meta: 'Document',
    hasChildren: true,
    expanded: false,
  },
];

describe('ExplorerTree', () => {
  it('toggles, opens, and renders actions', () => {
    const onToggle = vi.fn();
    const onOpen = vi.fn();
    const onAction = vi.fn();
    render(
      <ExplorerTree
        rows={rows}
        renderAction={(node) => (
          <button type='button' onClick={() => onAction(node.id)}>Action</button>
        )}
        onOpen={onOpen}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByText('one'));
    fireEvent.doubleClick(screen.getByText('one'));
    fireEvent.click(screen.getByRole('button', { name: 'Action' }));

    expect(onToggle).toHaveBeenCalledWith('doc:one');
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('doc:one');
    expect(onAction).toHaveBeenCalledWith('doc:one');
  });

  it('supports keyboard navigation and toggling from the full row', () => {
    const onToggle = vi.fn();
    const onOpen = vi.fn();
    render(
      <ExplorerTree
        rows={[
          ...rows,
          {
            id: 'doc:two',
            label: 'two',
            level: 0,
            hasChildren: false,
          },
        ]}
        onOpen={onOpen}
        onToggle={onToggle}
      />,
    );

    const first = screen.getByRole('treeitem', { name: /one/ });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    const second = screen.getByRole('treeitem', { name: /two/ });
    fireEvent.keyDown(second, { key: 'Enter' });

    expect(onToggle).toHaveBeenCalledWith('doc:one');
    expect(onOpen).toHaveBeenCalledWith('doc:two');
  });
});
