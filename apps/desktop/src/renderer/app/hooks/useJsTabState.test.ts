import type { ProjectSummary, ScriptRunResult } from '@firebase-desk/repo-contracts';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tabActions, tabsStore } from '../stores/tabsStore.ts';
import { useJsTabState } from './useJsTabState.ts';
import { useRunScript } from './useRepositoriesData.ts';

vi.mock('./useRepositoriesData.ts', () => ({
  useRunScript: vi.fn(),
}));

const project: ProjectSummary = {
  id: 'emu',
  name: 'Local Emulator',
  projectId: 'demo-local',
  target: 'emulator',
  emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
  hasCredential: false,
  credentialEncrypted: null,
  createdAt: '2026-04-27T00:00:00.000Z',
};

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
  });

  it('runs the active tab script and stores successful result', () => {
    const tabId = tabActions.openTab({ kind: 'js-query', connectionId: 'emu' });
    const tab = tabsStore.state.tabs.find((item) => item.id === tabId)!;
    const recordInteraction = vi.spyOn(tabActions, 'recordInteraction').mockImplementation(
      () => {},
    );
    const { result } = renderHook(() =>
      useJsTabState({
        activeProject: project,
        activeTab: tab,
        selectedTreeItemId: 'script:emu',
      })
    );

    act(() => result.current.setScriptSource('return { ok: true };'));
    act(() => {
      expect(result.current.runScript()).toBe(true);
    });

    expect(useRunScript().mutate).toHaveBeenCalledWith(
      { projectId: 'demo-local', source: 'return { ok: true };' },
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
        activeProject: project,
        activeTab: tab,
        selectedTreeItemId: 'auth:emu',
      })
    );

    act(() => {
      expect(result.current.runScript()).toBe(false);
    });

    expect(useRunScript().mutate).not.toHaveBeenCalled();
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
