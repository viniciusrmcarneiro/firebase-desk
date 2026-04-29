import type { SettingsRepository, SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { type DataTableColumn } from '@firebase-desk/ui';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectionLayoutKeyForPath, useResultTableLayout } from './resultTableLayout.ts';

const settingsSnapshot: SettingsSnapshot = {
  dataMode: 'mock',
  firestoreFieldCatalogs: {},
  hotkeyOverrides: {},
  inspectorWidth: 360,
  resultTableLayouts: {},
  sidebarWidth: 320,
  theme: 'system',
};

const columns: ReadonlyArray<DataTableColumn<{ id: string; }>> = [
  { id: 'id', header: 'ID', cell: () => null },
];

describe('result table layout keys', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes document ids from nested collection paths', () => {
    expect(collectionLayoutKeyForPath('orders/ord_1/skiers/skier_1/results')).toBe(
      'orders/skiers/results',
    );
  });

  it('uses the root collection name for document paths', () => {
    expect(collectionLayoutKeyForPath('orders/ord_1')).toBe('orders');
  });

  it('clears pending saves when unmounted', () => {
    vi.useFakeTimers();
    const settings: SettingsRepository = {
      load: vi.fn(async () => settingsSnapshot),
      save: vi.fn(async () => settingsSnapshot),
      getHotkeyOverrides: vi.fn(async () => ({})),
      setHotkeyOverrides: vi.fn(async () => undefined),
    };
    const { result, unmount } = renderHook(() =>
      useResultTableLayout({ columns, queryPath: 'orders', settings })
    );

    act(() => {
      result.current.saveLayout({ columnOrder: ['id'], columnSizing: { id: 180 } });
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(settings.save).not.toHaveBeenCalled();
  });
});
