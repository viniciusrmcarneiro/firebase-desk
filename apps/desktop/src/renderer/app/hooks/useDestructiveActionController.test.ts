import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDestructiveActionController } from './useDestructiveActionController.ts';

describe('useDestructiveActionController', () => {
  it('keeps one pending destructive action and clears when closed', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() => useDestructiveActionController());

    act(() =>
      result.current.request({
        confirmLabel: 'Delete',
        description: 'Delete item?',
        onConfirm,
        title: 'Delete item',
      })
    );

    expect(result.current.pendingAction?.title).toBe('Delete item');

    act(() => result.current.setOpen(false));

    expect(result.current.pendingAction).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
