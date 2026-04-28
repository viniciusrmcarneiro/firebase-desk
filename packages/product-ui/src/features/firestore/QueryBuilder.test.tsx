import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from './QueryBuilder.tsx';
import type { FirestoreQueryDraft } from './types.ts';

const draft: FirestoreQueryDraft = {
  path: 'orders',
  filters: [{ id: 'filter-1', field: 'status', op: '==', value: 'paid' }],
  filterField: 'status',
  filterOp: '==',
  filterValue: 'paid',
  limit: 25,
  sortDirection: 'desc',
  sortField: 'updatedAt',
};

describe('QueryBuilder', () => {
  it('runs collection queries and updates filter draft state', () => {
    const onDraftChange = vi.fn();
    const onRun = vi.fn();
    render(
      <QueryBuilder
        draft={draft}
        isLoading={false}
        onDraftChange={onDraftChange}
        onReset={() => {}}
        onRun={onRun}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    fireEvent.change(screen.getByLabelText('Filter 1 field'), {
      target: { value: 'state' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onDraftChange).toHaveBeenCalledWith(expect.objectContaining({
      filterField: 'state',
      filters: [expect.objectContaining({ field: 'state' })],
    }));
    expect(onDraftChange).toHaveBeenCalledWith(expect.objectContaining({
      filters: [
        expect.objectContaining({ id: 'filter-1' }),
        expect.objectContaining({ id: 'filter-2' }),
      ],
    }));
  });

  it('hides collection-only controls for document paths', () => {
    render(
      <QueryBuilder
        draft={{ ...draft, path: 'orders/ord_1024' }}
        isLoading={false}
        onDraftChange={() => {}}
        onReset={() => {}}
        onRun={() => {}}
      />,
    );

    expect(screen.queryByLabelText('Result limit')).toBeNull();
    expect(screen.queryByLabelText('Filter 1 field')).toBeNull();
    expect(screen.queryByLabelText('Sort field')).toBeNull();
    expect(screen.getByText(/Filters, sorting, limits, and pagination are hidden/)).toBeTruthy();
  });
});
