import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tabActions, tabsStore } from '../stores/tabsStore.ts';
import { useJsTabState } from './useJsTabState.ts';
import { useCancelScript, useRunScript } from './useRepositoriesData.ts';

vi.mock('./useRepositoriesData.ts', () => ({
  useCancelScript: vi.fn(),
  useRunScript: vi.fn(),
}));

const scriptResult: ScriptRunResult = {
  durationMs: 3,
  errors: [],
  logs: [],
  returnValue: { ok: true },
};

describe('useJsTabState', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    tabActions.reset();
    vi.mocked(useRunScript).mockReturnValue(runScriptResult());
    vi.mocked(useCancelScript).mockReturnValue(cancelScriptResult());
  });

  it('runs the active tab script and stores successful result', () => {
    const tabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const recordInteraction = vi.spyOn(tabActions, 'recordInteraction').mockImplementation(
      () => {},
    );
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        selectedTreeItemId: 'script:emu',
      })
    );

    act(() => result.current.setScriptSource('return { ok: true };'));
    act(() => {
      expect(result.current.runScript()).toBe(true);
    });

    expect(useRunScript().mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'emu',
        runId: expect.any(String),
        source: 'return { ok: true };',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(recordInteraction).toHaveBeenCalledWith({
      activeTabId: tab.id,
      path: 'scripts/default',
      selectedTreeItemId: 'script:emu',
    });
    expect(result.current.scriptResult).toEqual(scriptResult);
  });

  it('does not run from a non-js tab', () => {
    const tabId = tabActions.openTab({ kind: 'auth-users', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        selectedTreeItemId: 'auth:emu',
      })
    );

    act(() => {
      expect(result.current.runScript()).toBe(false);
    });

    expect(useRunScript().mutate).not.toHaveBeenCalled();
  });

  it('cancels the active script run', () => {
    const mutate = vi.fn();
    const cancelMutate = vi.fn();
    vi.mocked(useRunScript).mockReturnValue({
      isPending: true,
      mutate,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useRunScript>);
    vi.mocked(useCancelScript).mockReturnValue({
      mutate: cancelMutate,
    } as unknown as ReturnType<typeof useCancelScript>);
    const tabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        selectedTreeItemId: 'script:emu',
      })
    );

    act(() => {
      expect(result.current.runScript()).toBe(true);
    });
    const request = mutate.mock.calls[0]?.[0] as { readonly runId: string; };

    expect(result.current.isRunning).toBe(true);
    act(() => {
      expect(result.current.cancelScript()).toBe(true);
    });

    expect(cancelMutate).toHaveBeenCalledWith(
      request.runId,
      expect.objectContaining({
        onError: expect.any(Function),
      }),
    );
    expect(result.current.isRunning).toBe(false);
    expect(result.current.scriptResult?.cancelled).toBe(true);
  });

  it('keeps running state and start time scoped by tab', () => {
    const mutate = vi.fn();
    vi.mocked(useRunScript).mockReturnValue({
      isPending: true,
      mutate,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useRunScript>);
    const firstTabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const secondTabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const firstTab = tabsStore.state.tabs.find((item) => item.id === firstTabId)!;
    const secondTab = tabsStore.state.tabs.find((item) => item.id === secondTabId)!;
    const { result, rerender } = renderHook(
      ({ activeTab }) =>
        useJsTabState({
          activeTab,
          selectedTreeItemId: 'script:emu',
        }),
      { initialProps: { activeTab: firstTab } },
    );

    act(() => {
      expect(result.current.runScript()).toBe(true);
    });
    const startedAt = result.current.scriptStartedAt;

    rerender({ activeTab: secondTab });
    expect(result.current.isRunning).toBe(false);
    expect(result.current.scriptStartedAt).toBeNull();

    rerender({ activeTab: firstTab });
    expect(result.current.isRunning).toBe(true);
    expect(result.current.scriptStartedAt).toBe(startedAt);
  });

  it('cancels and clears a running script when its tab is cleared', () => {
    const mutate = vi.fn();
    const cancelMutate = vi.fn();
    vi.mocked(useRunScript).mockReturnValue({
      isPending: true,
      mutate,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useRunScript>);
    vi.mocked(useCancelScript).mockReturnValue({
      mutate: cancelMutate,
    } as unknown as ReturnType<typeof useCancelScript>);
    const tabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        selectedTreeItemId: 'script:emu',
      })
    );

    act(() => result.current.setScriptSource('await work();'));
    act(() => {
      expect(result.current.runScript()).toBe(true);
    });
    const request = mutate.mock.calls[0]?.[0] as { readonly runId: string; };

    expect(result.current.isTabRunning(tabId)).toBe(true);

    act(() => result.current.clearTab(tabId));

    expect(cancelMutate).toHaveBeenCalledWith(request.runId);
    expect(result.current.isTabRunning(tabId)).toBe(false);
    expect(result.current.scripts[tabId]).toBeUndefined();
  });
});

function runScriptResult() {
  const mutate = vi.fn(
    (_request, options?: { readonly onSuccess?: (result: ScriptRunResult) => void; }) => {
      options?.onSuccess?.(scriptResult);
    },
  );
  return {
    isPending: false,
    mutate,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useRunScript>;
}

function cancelScriptResult() {
  return {
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCancelScript>;
}
