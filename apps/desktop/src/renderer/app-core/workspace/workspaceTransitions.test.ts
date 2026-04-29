import { describe, expect, it } from 'vitest';
import { activePath, createInitialTabsState } from './workspaceState.ts';
import { initialSelectionState } from './workspaceState.ts';
import {
  allTabsClosed,
  authUserSelected,
  firestoreDocumentSelected,
  interactionMovedBack,
  interactionRecorded,
  otherTabsClosed,
  tabClosed,
  tabHistoryMovedBack,
  tabHistoryMovedForward,
  tabHistoryPushed,
  tabOpened,
  tabOpenedOrSelected,
  tabPathRestored,
  tabsReordered,
  tabsRestored,
  tabsSortedByProject,
  tabsToLeftClosed,
  tabsToRightClosed,
  treeItemSelected,
} from './workspaceTransitions.ts';

describe('workspace transitions', () => {
  it('opens and selects tabs with generated ids supplied by the adapter', () => {
    const result = tabOpened(
      createInitialTabsState('emu'),
      { kind: 'firestore-query', connectionId: 'emu', path: 'customers' },
      'tab-firestore-query-1',
    );

    expect(result.tabId).toBe('tab-firestore-query-1');
    expect(result.state.activeTabId).toBe('tab-firestore-query-1');
    expect(result.state.tabs.at(-1)?.title).toBe('customers');
  });

  it('selects existing tabs instead of duplicating them', () => {
    const state = createInitialTabsState('emu');

    const result = tabOpenedOrSelected(
      state,
      { kind: 'firestore-query', connectionId: 'emu', path: 'orders' },
      'tab-firestore-query-1',
    );

    expect(result.tabId).toBe('tab-firestore');
    expect(result.state.tabs).toHaveLength(3);
  });

  it('closes active and bulk tabs predictably', () => {
    const opened = tabOpened(
      createInitialTabsState('emu'),
      { kind: 'js-query', connectionId: 'stage' },
      'tab-js-query-1',
    ).state;

    expect(tabClosed(opened, 'tab-js-query-1').activeTabId).toBe('tab-js');
    expect(tabsToLeftClosed(opened, 'tab-js-query-1').tabs.map((tab) => tab.id)).toEqual([
      'tab-js-query-1',
    ]);
    expect(tabsToRightClosed(opened, 'tab-firestore').tabs.map((tab) => tab.id)).toEqual([
      'tab-firestore',
    ]);
    expect(otherTabsClosed(opened, 'tab-auth').tabs.map((tab) => tab.id)).toEqual(['tab-auth']);
    expect(allTabsClosed(opened).tabs).toEqual([]);
  });

  it('reorders and sorts tabs by account', () => {
    const state = tabOpened(
      createInitialTabsState('emu'),
      { kind: 'firestore-query', connectionId: 'prod', path: 'customers' },
      'tab-firestore-query-1',
    ).state;

    expect(tabsReordered(state, 'tab-js', 'tab-firestore').tabs[0]?.id).toBe('tab-js');
    expect(tabsSortedByProject(state).tabs.map((tab) => tab.connectionId)).toEqual([
      'emu',
      'emu',
      'emu',
      'prod',
    ]);
  });

  it('tracks tab history and path restoration', () => {
    const pushed = tabHistoryPushed(
      tabHistoryPushed(createInitialTabsState('emu'), 'tab-firestore', 'customers'),
      'tab-firestore',
      'featureFlags',
    );

    const back = tabHistoryMovedBack(pushed, 'tab-firestore');
    expect(activePath(back.tabs.find((tab) => tab.id === 'tab-firestore')!)).toBe('customers');

    const forward = tabHistoryMovedForward(back, 'tab-firestore');
    expect(activePath(forward.tabs.find((tab) => tab.id === 'tab-firestore')!)).toBe(
      'featureFlags',
    );

    const restored = tabPathRestored(forward, 'tab-firestore', 'orders');
    expect(activePath(restored.tabs.find((tab) => tab.id === 'tab-firestore')!)).toBe('orders');
  });

  it('replays interaction history without changing open tabs', () => {
    const state = interactionRecorded(
      interactionRecorded(createInitialTabsState('emu'), {
        activeTabId: 'tab-firestore',
        path: 'orders',
        selectedTreeItemId: 'collection:emu:orders',
      }),
      {
        activeTabId: 'tab-auth',
        path: 'auth/users',
        selectedTreeItemId: 'auth:emu',
      },
    );

    const result = interactionMovedBack(state);

    expect(result.entry).toEqual({
      activeTabId: 'tab-firestore',
      path: 'orders',
      selectedTreeItemId: 'collection:emu:orders',
    });
    expect(result.state.tabs).toHaveLength(3);
  });

  it('normalizes restored tabs and interaction history', () => {
    const restored = tabsRestored({
      activeTabId: 'missing',
      interactionHistory: [
        { activeTabId: 'tab-one', selectedTreeItemId: null },
        { activeTabId: 'missing', selectedTreeItemId: null },
      ],
      interactionHistoryIndex: 99,
      tabs: [{
        connectionId: 'emu',
        history: [],
        historyIndex: 99,
        id: 'tab-one',
        inspectorWidth: Number.NaN,
        kind: 'firestore-query',
        title: 'stale',
      }],
    });

    expect(restored.activeTabId).toBe('tab-one');
    expect(restored.interactionHistory).toHaveLength(1);
    expect(restored.tabs[0]).toMatchObject({
      history: ['orders'],
      historyIndex: 0,
      inspectorWidth: 360,
      title: 'orders',
    });
  });

  it('tracks selection slices independently', () => {
    const state = authUserSelected(
      firestoreDocumentSelected(
        treeItemSelected(initialSelectionState, 'collection:emu:orders'),
        'orders/ord_1024',
      ),
      'u_ada',
    );

    expect(state).toEqual({
      authUserId: 'u_ada',
      firestoreDocumentPath: 'orders/ord_1024',
      treeItemId: 'collection:emu:orders',
    });
  });
});
