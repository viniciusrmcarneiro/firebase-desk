import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OverviewCollapseStrip, ResultContextPanel } from './ResultOverviewPanel.tsx';

describe('ResultOverviewPanel', () => {
  it('shows field catalog and selected document actions', () => {
    const onCollapse = vi.fn();
    const onEdit = vi.fn();

    render(
      <ResultContextPanel
        resultView='table'
        rows={[{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: { total: 10 },
          hasSubcollections: false,
        }]}
        selectedDocument={{
          id: 'ord_1',
          path: 'orders/ord_1',
          data: { total: 10 },
          hasSubcollections: false,
        }}
        onCollapse={onCollapse}
        onEditDocument={onEdit}
      />,
    );

    expect(screen.getByText('Fields in results')).toBeTruthy();
    expect(screen.getByText('orders/ord_1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit document' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse result overview' }));

    expect(onEdit).toHaveBeenCalledWith({
      id: 'ord_1',
      path: 'orders/ord_1',
      data: { total: 10 },
      hasSubcollections: false,
    });
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('expands collapsed overview strip', () => {
    const onExpand = vi.fn();

    render(<OverviewCollapseStrip onExpand={onExpand} />);
    fireEvent.click(screen.getByRole('button'));

    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
