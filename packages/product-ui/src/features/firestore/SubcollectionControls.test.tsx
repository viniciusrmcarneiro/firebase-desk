import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderSubcollectionButtons, SubcollectionChipList } from './SubcollectionControls.tsx';

describe('SubcollectionControls', () => {
  it('loads lazy subcollections', () => {
    const onLoad = vi.fn();

    render(
      <>
        {renderSubcollectionButtons(
          { id: 'ord_1', path: 'orders/ord_1', data: {}, hasSubcollections: true },
          undefined,
          undefined,
          onLoad,
        )}
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Load/ }));

    expect(onLoad).toHaveBeenCalledWith('orders/ord_1');
  });

  it('opens collection chips', () => {
    const onOpen = vi.fn();

    render(
      <SubcollectionChipList
        collections={[{ id: 'events', path: 'orders/ord_1/events' }]}
        maxItems={10}
        onOpenDocumentInNewTab={onOpen}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /events/ }));

    expect(onOpen).toHaveBeenCalledWith('orders/ord_1/events');
  });
});
