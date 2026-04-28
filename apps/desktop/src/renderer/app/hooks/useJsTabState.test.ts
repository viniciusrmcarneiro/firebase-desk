import type { ScriptRunEvent, ScriptRunResult } from '@firebase-desk/repo-contracts';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRepositories } from '../RepositoryProvider.tsx';
import { tabActions, tabsStore } from '../stores/tabsStore.ts';
import { useJsTabState } from './useJsTabState.ts';
import { useCancelScript, useRunScript } from './useRepositoriesData.ts';

vi.mock('../RepositoryProvider.tsx', () => ({
  useRepositories: vi.fn(),
}));

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

function scriptRunRequest(mutate: ReturnType<typeof vi.fn>, index = 0) {
  const call = mutate.mock.calls.at(index);
  expect(call).toBeDefined();
  return call![0] as { readonly runId: string; };
}

describe('useJsTabState', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    tabActions.reset();
    vi.mocked(useRepositories).mockReturnValue({
      scriptRunner: {
        subscribe: vi.fn(() => () => {}),
      },
    } as unknown as ReturnType<typeof useRepositories>);
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
    const request = scriptRunRequest(mutate);

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

  it('merges live script output into the active tab', () => {
    const mutate = vi.fn();
    const cancelMutate = vi.fn();
    let listener: ((event: ScriptRunEvent) => void) | null = null;
    vi.mocked(useRepositories).mockReturnValue({
      scriptRunner: {
        subscribe: vi.fn((next) => {
          listener = next;
          return () => {};
        }),
      },
    } as unknown as ReturnType<typeof useRepositories>);
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
    const request = scriptRunRequest(mutate);
    act(() =>
      listener?.({
        type: 'output',
        runId: request.runId,
        item: { id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 },
      })
    );

    expect(result.current.scriptResult?.stream).toEqual([
      expect.objectContaining({ label: 'yield 1', value: 1 }),
    ]);
  });

  it('ignores stale live script events after a rerun', () => {
    const mutate = vi.fn();
    let listener: ((event: ScriptRunEvent) => void) | null = null;
    vi.mocked(useRepositories).mockReturnValue({
      scriptRunner: {
        subscribe: vi.fn((next) => {
          listener = next;
          return () => {};
        }),
      },
    } as unknown as ReturnType<typeof useRepositories>);
    vi.mocked(useRunScript).mockReturnValue({
      isPending: true,
      mutate,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useRunScript>);
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
    const firstRunId = scriptRunRequest(mutate).runId;
    act(() => {
      expect(result.current.runScript()).toBe(true);
    });
    const secondRunId = scriptRunRequest(mutate, 1).runId;

    act(() =>
      listener?.({
        type: 'output',
        runId: firstRunId,
        item: { id: 'yield-1', label: 'stale', badge: 'number', view: 'json', value: 1 },
      })
    );
    expect(result.current.scriptResult).toBeUndefined();

    act(() =>
      listener?.({
        type: 'output',
        runId: secondRunId,
        item: { id: 'yield-1', label: 'fresh', badge: 'number', view: 'json', value: 2 },
      })
    );
    expect(result.current.scriptResult?.stream?.[0]).toMatchObject({ label: 'fresh' });
  });

  it('ignores live script events after a tab is cleared', () => {
    const mutate = vi.fn();
    const cancelMutate = vi.fn();
    let listener: ((event: ScriptRunEvent) => void) | null = null;
    vi.mocked(useRepositories).mockReturnValue({
      scriptRunner: {
        subscribe: vi.fn((next) => {
          listener = next;
          return () => {};
        }),
      },
    } as unknown as ReturnType<typeof useRepositories>);
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
    const runId = scriptRunRequest(mutate).runId;
    act(() => result.current.clearTab(tabId));
    act(() =>
      listener?.({
        type: 'output',
        runId,
        item: { id: 'yield-1', label: 'ignored', badge: 'number', view: 'json', value: 1 },
      })
    );

    expect(cancelMutate).toHaveBeenCalledWith(runId);
    expect(result.current.scriptResult).toBeUndefined();
    expect(result.current.scripts[tabId]).toBeUndefined();
  });

  it('keeps partial output when cancelling a running script', () => {
    const mutate = vi.fn();
    const cancelMutate = vi.fn();
    let listener: ((event: ScriptRunEvent) => void) | null = null;
    vi.mocked(useRepositories).mockReturnValue({
      scriptRunner: {
        subscribe: vi.fn((next) => {
          listener = next;
          return () => {};
        }),
      },
    } as unknown as ReturnType<typeof useRepositories>);
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
    const runId = scriptRunRequest(mutate).runId;
    act(() =>
      listener?.({
        type: 'output',
        runId,
        item: { id: 'yield-1', label: 'yield 1', badge: 'number', view: 'json', value: 1 },
      })
    );
    act(() => {
      expect(result.current.cancelScript()).toBe(true);
    });

    expect(result.current.scriptResult).toMatchObject({
      cancelled: true,
      stream: [expect.objectContaining({ label: 'yield 1' })],
    });
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
    const request = scriptRunRequest(mutate);

    expect(result.current.isTabRunning(tabId)).toBe(true);

    act(() => result.current.clearTab(tabId));

    expect(cancelMutate).toHaveBeenCalledWith(request.runId);
    expect(result.current.isTabRunning(tabId)).toBe(false);
    expect(result.current.scripts[tabId]).toBeUndefined();
  });

  it('does not repopulate a cleared tab when cancel fails later', () => {
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
    act(() => {
      expect(result.current.cancelScript()).toBe(true);
    });
    const options = cancelMutate.mock.calls[0]?.[1] as {
      readonly onError: (error: unknown) => void;
    };

    act(() => result.current.clearTab(tabId));
    act(() => options.onError(new Error('cancel failed')));

    expect(result.current.scriptResult).toBeUndefined();
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
