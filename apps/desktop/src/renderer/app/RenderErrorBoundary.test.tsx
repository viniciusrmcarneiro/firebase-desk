import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RenderErrorBoundary } from './RenderErrorBoundary.tsx';

describe('RenderErrorBoundary', () => {
  it('renders a fallback instead of unmounting the app tree', () => {
    const onError = vi.fn();

    render(
      <RenderErrorBoundary label='Workspace' resetKey='tab-1' onError={onError}>
        <BrokenView />
      </RenderErrorBoundary>,
    );

    expect(screen.getByText('Workspace failed: render failed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry view' })).toBeTruthy();
    expect(onError).toHaveBeenCalledWith('render failed');
  });

  it('recovers when the reset key changes', async () => {
    const { rerender } = render(
      <RenderErrorBoundary label='Workspace' resetKey='tab-1'>
        <BrokenView />
      </RenderErrorBoundary>,
    );

    rerender(
      <RenderErrorBoundary label='Workspace' resetKey='tab-2'>
        <div>Recovered tab</div>
      </RenderErrorBoundary>,
    );

    await waitFor(() => expect(screen.getByText('Recovered tab')).toBeTruthy());
  });

  it('can retry the same view from the fallback', async () => {
    const retryingView = vi.fn(() => <div>Recovered view</div>);
    const { rerender } = render(
      <RenderErrorBoundary label='Workspace' resetKey='tab-1'>
        <BrokenView />
      </RenderErrorBoundary>,
    );

    rerender(
      <RenderErrorBoundary label='Workspace' resetKey='tab-1'>
        {retryingView()}
      </RenderErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry view' }));

    await waitFor(() => expect(screen.getByText('Recovered view')).toBeTruthy());
  });
});

function BrokenView(): never {
  throw new Error('render failed');
}
