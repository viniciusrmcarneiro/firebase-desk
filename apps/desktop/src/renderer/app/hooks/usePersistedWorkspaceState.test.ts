// @vitest-environment jsdom

import type { SettingsRepository } from '@firebase-desk/repo-contracts';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  usePersistWorkspaceSnapshot,
  type WorkspacePersistenceSnapshot,
} from './usePersistedWorkspaceState.ts';

describe('usePersistWorkspaceSnapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips the initial restore snapshot and debounces later saves', async () => {
    const settings = settingsSaveSpy();
    const { rerender } = renderHook(
      (props: { readonly snapshot: WorkspacePersistenceSnapshot; }) =>
        usePersistWorkspaceSnapshot(props.snapshot, {
          debounceMs: 50,
          enabled: true,
          settings,
        }),
      { initialProps: { snapshot: snapshot('orders') } },
    );

    expect(settings.save).not.toHaveBeenCalled();

    rerender({ snapshot: snapshot('customers') });
    rerender({ snapshot: snapshot('invoices') });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(49);
    });
    expect(settings.save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(settings.save).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(settings.save.mock.calls[0]?.[0].workspaceState)).toContain('invoices');
    expect(JSON.stringify(settings.save.mock.calls[0]?.[0].workspaceState)).not.toContain(
      'customers',
    );
  });

  it('does not resave equivalent snapshots', async () => {
    const settings = settingsSaveSpy();
    const { rerender } = renderHook(
      (props: { readonly snapshot: WorkspacePersistenceSnapshot; }) =>
        usePersistWorkspaceSnapshot(props.snapshot, {
          debounceMs: 50,
          enabled: true,
          settings,
        }),
      { initialProps: { snapshot: snapshot('orders') } },
    );

    rerender({ snapshot: snapshot('orders') });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(settings.save).not.toHaveBeenCalled();

    rerender({ snapshot: snapshot('customers') });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(settings.save).toHaveBeenCalledTimes(1);

    rerender({ snapshot: snapshot('customers') });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(settings.save).toHaveBeenCalledTimes(1);
  });

  it('flushes the queued snapshot when unmounted', async () => {
    const settings = settingsSaveSpy();
    const { rerender, unmount } = renderHook(
      (props: { readonly snapshot: WorkspacePersistenceSnapshot; }) =>
        usePersistWorkspaceSnapshot(props.snapshot, {
          debounceMs: 50,
          enabled: true,
          settings,
        }),
      { initialProps: { snapshot: snapshot('orders') } },
    );

    rerender({ snapshot: snapshot('customers') });
    unmount();
    await act(async () => {
      await Promise.resolve();
    });

    expect(settings.save).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(settings.save.mock.calls[0]?.[0].workspaceState)).toContain(
      'customers',
    );
  });
});

function settingsSaveSpy(): Pick<SettingsRepository, 'save'> & {
  readonly save: ReturnType<typeof vi.fn<SettingsRepository['save']>>;
} {
  return {
    save: vi.fn(async () => ({}) as never),
  };
}

function snapshot(path: string): WorkspacePersistenceSnapshot {
  return {
    authFilter: '',
    drafts: {
      'tab-firestore-1': {
        filterField: '',
        filterOp: '==',
        filterValue: '',
        filters: [],
        limit: 25,
        path,
        sortDirection: 'asc',
        sortField: '',
      },
    },
    scripts: { 'tab-js-1': `return ${JSON.stringify(path)};` },
    tabsState: {
      activeTabId: 'tab-firestore-1',
      interactionHistory: [],
      interactionHistoryIndex: -1,
      tabs: [{
        connectionId: 'emu',
        history: [path],
        historyIndex: 0,
        id: 'tab-firestore-1',
        inspectorWidth: 360,
        kind: 'firestore-query',
        title: path,
      }],
    },
  };
}
