// @vitest-environment jsdom

import type {
  ActivityLogAppendInput,
  ScriptRunEvent,
  ScriptRunnerRepository,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRepositories } from '../RepositoryProvider.tsx';
import { tabActions, tabsStore } from '../stores/tabsStore.ts';
import { useJsTabState } from './useJsTabState.ts';

vi.mock('../RepositoryProvider.tsx', () => ({
  useRepositories: vi.fn(),
}));

const scriptResult: ScriptRunResult = {
  durationMs: 3,
  errors: [],
  logs: [],
  returnValue: { ok: true },
};

type RecordActivityMock = ReturnType<
  typeof vi.fn<(input: ActivityLogAppendInput) => void>
>;

describe('useJsTabState', () => {
  let listener: ((event: ScriptRunEvent) => void) | null;
  let scriptRunner: ScriptRunnerRepository;
  let recordActivity: (input: ActivityLogAppendInput) => void;
  let recordActivityMock: RecordActivityMock;

  beforeEach(() => {
    vi.restoreAllMocks();
    tabActions.reset();
    listener = null;
    recordActivityMock = vi.fn<(input: ActivityLogAppendInput) => void>();
    recordActivity = (input) => {
      recordActivityMock(input);
    };
    scriptRunner = {
      cancel: vi.fn(async () => {}),
      run: vi.fn(async () => scriptResult),
      subscribe: vi.fn((next) => {
        listener = next;
        return () => {};
      }),
    };
    vi.mocked(useRepositories).mockReturnValue({
      scriptRunner,
    } as ReturnType<typeof useRepositories>);
  });

  it('runs the active tab script and stores successful result', async () => {
    const tabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const recordInteraction = vi.spyOn(tabActions, 'recordInteraction').mockImplementation(
      () => {},
    );
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        recordActivity,
        selectedTreeItemId: 'script:emu',
      })
    );

    act(() => result.current.setScriptSource('return { ok: true };'));
    await act(async () => {
      expect(result.current.runScript()).toBe(true);
      await Promise.resolve();
    });

    expect(scriptRunner.run).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'emu',
        runId: expect.any(String),
        source: 'return { ok: true };',
      }),
    );
    expect(recordInteraction).toHaveBeenCalledWith({
      activeTabId: tab.id,
      path: 'scripts/default',
      selectedTreeItemId: 'script:emu',
    });
    expect(result.current.scriptResult).toEqual(scriptResult);
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Run JavaScript query', status: 'success' }),
    );
  });

  it('does not run from a non-js tab', () => {
    const tabId = tabActions.openTab({ kind: 'auth-users', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        recordActivity,
        selectedTreeItemId: 'auth:emu',
      })
    );

    act(() => {
      expect(result.current.runScript()).toBe(false);
    });

    expect(scriptRunner.run).not.toHaveBeenCalled();
  });

  it('cancels the active script run', async () => {
    vi.mocked(scriptRunner.run).mockReturnValue(new Promise(() => {}));
    const tabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        recordActivity,
        selectedTreeItemId: 'script:emu',
      })
    );

    act(() => {
      expect(result.current.runScript()).toBe(true);
    });
    const runId = scriptRunRequest(scriptRunner.run).runId;

    expect(result.current.isRunning).toBe(true);
    await act(async () => {
      expect(result.current.cancelScript()).toBe(true);
      await Promise.resolve();
    });

    expect(scriptRunner.cancel).toHaveBeenCalledWith(runId);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.scriptResult?.cancelled).toBe(true);
    expect(recordActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Cancel JavaScript query', status: 'cancelled' }),
    );
  });

  it('merges live script output into the active tab', () => {
    vi.mocked(scriptRunner.run).mockReturnValue(new Promise(() => {}));
    const tabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        recordActivity,
        selectedTreeItemId: 'script:emu',
      })
    );

    act(() => {
      expect(result.current.runScript()).toBe(true);
    });
    const request = scriptRunRequest(scriptRunner.run);
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
    vi.mocked(scriptRunner.run).mockReturnValue(new Promise(() => {}));
    const tabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        recordActivity,
        selectedTreeItemId: 'script:emu',
      })
    );

    act(() => {
      expect(result.current.runScript()).toBe(true);
    });
    const firstRunId = scriptRunRequest(scriptRunner.run).runId;
    act(() => {
      expect(result.current.runScript()).toBe(true);
    });
    const secondRunId = scriptRunRequest(scriptRunner.run, 1).runId;

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

  it('ignores live script events after a tab is cleared', async () => {
    vi.mocked(scriptRunner.run).mockReturnValue(new Promise(() => {}));
    const tabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const { result } = renderHook(() =>
      useJsTabState({
        activeTab: tab,
        recordActivity,
        selectedTreeItemId: 'script:emu',
      })
    );

    act(() => {
      expect(result.current.runScript()).toBe(true);
    });
    const runId = scriptRunRequest(scriptRunner.run).runId;
    await act(async () => {
      result.current.clearTab(tabId);
      await Promise.resolve();
    });
    act(() =>
      listener?.({
        type: 'output',
        runId,
        item: { id: 'yield-1', label: 'ignored', badge: 'number', view: 'json', value: 1 },
      })
    );

    expect(scriptRunner.cancel).toHaveBeenCalledWith(runId);
    expect(result.current.scriptResult).toBeUndefined();
    expect(result.current.scripts[tabId]).toBeUndefined();
  });

  it('keeps running state and start time scoped by tab', () => {
    vi.mocked(scriptRunner.run).mockReturnValue(new Promise(() => {}));
    const firstTabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const secondTabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const firstTab = tabsStore.state.tabs.find((item) => item.id === firstTabId)!;
    const secondTab = tabsStore.state.tabs.find((item) => item.id === secondTabId)!;
    const { result, rerender } = renderHook(
      ({ activeTab }) =>
        useJsTabState({
          activeTab,
          recordActivity,
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
});

function scriptRunRequest(run: ScriptRunnerRepository['run'], index = 0) {
  const call = vi.mocked(run).mock.calls.at(index);
  expect(call).toBeDefined();
  return call![0] as { readonly runId: string; };
}
