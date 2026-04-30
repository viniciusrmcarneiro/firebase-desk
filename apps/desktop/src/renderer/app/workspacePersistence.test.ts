import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadPersistedWorkspaceState,
  loadPersistedWorkspaceStateResult,
  type PersistedWorkspaceState,
  savePersistedWorkspaceState,
  WORKSPACE_STATE_STORAGE_KEY,
} from './workspacePersistence.ts';

const persistedWorkspace: PersistedWorkspaceState = {
  version: 1,
  authFilter: 'ada',
  scripts: { 'tab-js-1': 'return 1;' },
  tabsState: {
    activeTabId: 'tab-firestore-1',
    interactionHistory: [{
      activeTabId: 'tab-firestore-1',
      path: 'orders',
      selectedTreeItemId: 'collection:emu:orders',
    }],
    interactionHistoryIndex: 0,
    tabs: [
      {
        id: 'tab-firestore-1',
        kind: 'firestore-query',
        title: 'orders',
        connectionId: 'emu',
        history: ['orders'],
        historyIndex: 0,
        inspectorWidth: 360,
      },
      {
        id: 'tab-js-1',
        kind: 'js-query',
        title: 'JS Query',
        connectionId: 'emu',
        history: ['scripts/default'],
        historyIndex: 0,
        inspectorWidth: 360,
      },
    ],
  },
  drafts: {
    'tab-firestore-1': {
      path: 'orders',
      filters: [{ id: 'filter-1', field: 'status', op: '==', value: '"paid"' }],
      filterField: 'status',
      filterOp: '==',
      filterValue: '"paid"',
      sortField: 'updatedAt',
      sortDirection: 'desc',
      limit: 25,
    },
  },
};

describe('workspacePersistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('loads valid user workspace state', () => {
    window.localStorage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify(persistedWorkspace));

    expect(loadPersistedWorkspaceState()).toEqual(persistedWorkspace);
  });

  it('does not restore invalid workspace state', () => {
    window.localStorage.setItem(
      WORKSPACE_STATE_STORAGE_KEY,
      JSON.stringify({
        ...persistedWorkspace,
        tabsState: { ...persistedWorkspace.tabsState, activeTabId: 'missing-tab' },
      }),
    );

    expect(loadPersistedWorkspaceState()).toBeNull();
    expect(loadPersistedWorkspaceStateResult().error).toMatchObject({
      operation: 'load',
    });
  });

  it('does not restore invalid tab history state', () => {
    window.localStorage.setItem(
      WORKSPACE_STATE_STORAGE_KEY,
      JSON.stringify({
        ...persistedWorkspace,
        tabsState: {
          ...persistedWorkspace.tabsState,
          tabs: [
            { ...persistedWorkspace.tabsState.tabs[0]!, historyIndex: 1 },
            persistedWorkspace.tabsState.tabs[1]!,
          ],
        },
      }),
    );

    expect(loadPersistedWorkspaceState()).toBeNull();
  });

  it('does not restore invalid draft state', () => {
    window.localStorage.setItem(
      WORKSPACE_STATE_STORAGE_KEY,
      JSON.stringify({
        ...persistedWorkspace,
        drafts: {
          'tab-firestore-1': {
            ...persistedWorkspace.drafts['tab-firestore-1']!,
            filterOp: 'contains',
          },
        },
      }),
    );

    expect(loadPersistedWorkspaceState()).toBeNull();
  });

  it('saves only user tab state and drops orphan tab records', () => {
    expect(savePersistedWorkspaceState({
      ...persistedWorkspace,
      drafts: {
        ...persistedWorkspace.drafts,
        'closed-tab': {
          ...persistedWorkspace.drafts['tab-firestore-1']!,
          path: 'customers',
        },
      },
      scripts: { ...persistedWorkspace.scripts, 'closed-tab': 'return 2;' },
    })).toBeNull();

    const raw = window.localStorage.getItem(WORKSPACE_STATE_STORAGE_KEY) ?? '';
    expect(raw).toContain('tab-firestore-1');
    expect(raw).toContain('tab-js-1');
    expect(raw).not.toContain('closed-tab');
    expect(raw).not.toContain('queryRequests');
    expect(raw).not.toContain('scriptResults');
  });

  it('removes storage when no tabs are open', () => {
    window.localStorage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify(persistedWorkspace));

    expect(savePersistedWorkspaceState({
      authFilter: '',
      drafts: {},
      scripts: {},
      tabsState: {
        activeTabId: '',
        interactionHistory: [],
        interactionHistoryIndex: 0,
        tabs: [],
      },
    })).toBeNull();

    expect(window.localStorage.getItem(WORKSPACE_STATE_STORAGE_KEY)).toBeNull();
  });

  it('returns save failures instead of swallowing them', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(savePersistedWorkspaceState(persistedWorkspace)).toEqual({
      message: 'quota exceeded',
      operation: 'save',
    });
  });
});
