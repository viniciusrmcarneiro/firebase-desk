import { Store } from '@tanstack/react-store';

export const WORKSPACE_TAB_KINDS = ['firestore-query', 'auth-users', 'js-query'] as const;

export type WorkspaceTabKind = (typeof WORKSPACE_TAB_KINDS)[number];

export interface WorkspaceTab {
  readonly id: string;
  readonly kind: WorkspaceTabKind;
  readonly title: string;
  readonly connectionId: string;
  readonly history: ReadonlyArray<string>;
  readonly historyIndex: number;
  readonly inspectorWidth: number;
}

export interface InteractionHistoryEntry {
  readonly activeTabId: string;
  readonly path?: string;
  readonly selectedTreeItemId: string | null;
}

export interface TabsState {
  readonly activeTabId: string;
  readonly interactionHistory: ReadonlyArray<InteractionHistoryEntry>;
  readonly interactionHistoryIndex: number;
  readonly tabs: ReadonlyArray<WorkspaceTab>;
}

export interface OpenTabInput {
  readonly kind: WorkspaceTabKind;
  readonly connectionId: string;
  readonly path?: string;
}

const DEFAULT_INSPECTOR_WIDTH = 360;
let tabCounter = 0;

export const tabsStore = new Store<TabsState>(createEmptyState());

export const tabActions = {
  reset(connectionId?: string) {
    tabCounter = 0;
    tabsStore.setState(() => connectionId ? createInitialState(connectionId) : createEmptyState());
  },
  restore(state: TabsState) {
    const tabs = state.tabs.map(normalizeTab);
    const interactionHistory = state.interactionHistory.filter((entry) =>
      tabs.some((tab) => tab.id === entry.activeTabId)
    );
    tabsStore.setState(() => ({
      activeTabId: keepActiveTab(state.activeTabId, tabs),
      interactionHistory,
      interactionHistoryIndex: clampIndex(state.interactionHistoryIndex, interactionHistory),
      tabs,
    }));
    tabCounter = Math.max(tabCounter, ...tabs.map(tabCounterFor), 0);
  },
  openTab(input: OpenTabInput): string {
    const tab = createTab(input);
    tabsStore.setState((state) => ({
      ...state,
      activeTabId: tab.id,
      tabs: [...state.tabs, tab],
    }));
    return tab.id;
  },
  openOrSelectTab(input: OpenTabInput): string {
    const path = input.path ?? defaultPathFor(input.kind);
    const existing = tabsStore.state.tabs.find((tab) =>
      tab.kind === input.kind && tab.connectionId === input.connectionId && activePath(tab) === path
    );
    if (existing) {
      tabActions.selectTab(existing.id);
      return existing.id;
    }
    return tabActions.openTab(input);
  },
  selectTab(tabId: string) {
    tabsStore.setState((state) =>
      state.tabs.some((tab) => tab.id === tabId) ? { ...state, activeTabId: tabId } : state
    );
  },
  closeTab(tabId: string) {
    tabsStore.setState((state) => {
      const index = state.tabs.findIndex((tab) => tab.id === tabId);
      if (index < 0) return state;
      const tabs = state.tabs.filter((tab) => tab.id !== tabId);
      const activeTabId = state.activeTabId === tabId
        ? tabs[Math.max(0, index - 1)]?.id ?? tabs[0]?.id ?? ''
        : state.activeTabId;
      return { ...state, activeTabId, tabs };
    });
  },
  closeOtherTabs(tabId: string) {
    tabsStore.setState((state) => {
      const tab = state.tabs.find((item) => item.id === tabId);
      return tab ? { ...state, activeTabId: tab.id, tabs: [tab] } : state;
    });
  },
  closeTabsToLeft(tabId: string) {
    tabsStore.setState((state) => {
      const index = state.tabs.findIndex((tab) => tab.id === tabId);
      if (index <= 0) return state;
      const tabs = state.tabs.slice(index);
      return { ...state, activeTabId: keepActiveTab(state.activeTabId, tabs), tabs };
    });
  },
  closeTabsToRight(tabId: string) {
    tabsStore.setState((state) => {
      const index = state.tabs.findIndex((tab) => tab.id === tabId);
      if (index < 0 || index === state.tabs.length - 1) return state;
      const tabs = state.tabs.slice(0, index + 1);
      return { ...state, activeTabId: keepActiveTab(state.activeTabId, tabs), tabs };
    });
  },
  closeAllTabs() {
    tabsStore.setState((state) => ({
      ...state,
      activeTabId: '',
      interactionHistory: [],
      interactionHistoryIndex: 0,
      tabs: [],
    }));
  },
  reorderTabs(activeId: string, overId: string) {
    tabsStore.setState((state) => {
      const from = state.tabs.findIndex((tab) => tab.id === activeId);
      const to = state.tabs.findIndex((tab) => tab.id === overId);
      if (from < 0 || to < 0 || from === to) return state;
      const tabs = [...state.tabs];
      const [moved] = tabs.splice(from, 1);
      tabs.splice(to, 0, moved!);
      return { ...state, tabs };
    });
  },
  sortByProject() {
    tabsStore.setState((state) => {
      const tabs: WorkspaceTab[] = [];
      for (const tab of state.tabs) {
        const index = tabs.findIndex((item) => compareTabsByProject(tab, item) < 0);
        if (index < 0) tabs.push(tab);
        else tabs.splice(index, 0, tab);
      }
      return { ...state, tabs };
    });
  },
  updateConnection(tabId: string, connectionId: string) {
    updateTab(tabId, (tab) => ({ ...tab, connectionId }));
  },
  pushHistory(tabId: string, path: string) {
    updateTab(tabId, (tab) => {
      const current = tab.history[tab.historyIndex];
      if (current === path) return tab;
      const history = [...tab.history.slice(0, tab.historyIndex + 1), path];
      return { ...tab, history, historyIndex: history.length - 1, title: titleFor(tab.kind, path) };
    });
  },
  goBack(tabId: string) {
    updateTab(tabId, (tab) => {
      const historyIndex = Math.max(0, tab.historyIndex - 1);
      return { ...tab, historyIndex, title: titleFor(tab.kind, tab.history[historyIndex] ?? '') };
    });
  },
  goForward(tabId: string) {
    updateTab(tabId, (tab) => {
      const historyIndex = Math.min(tab.history.length - 1, tab.historyIndex + 1);
      return { ...tab, historyIndex, title: titleFor(tab.kind, tab.history[historyIndex] ?? '') };
    });
  },
  setInspectorWidth(tabId: string, inspectorWidth: number) {
    updateTab(tabId, (tab) => ({ ...tab, inspectorWidth }));
  },
  restorePath(tabId: string, path: string) {
    updateTab(tabId, (tab) => {
      const index = tab.history.findIndex((item) => item === path);
      if (index >= 0) return { ...tab, historyIndex: index, title: titleFor(tab.kind, path) };
      const history = [...tab.history, path];
      return { ...tab, history, historyIndex: history.length - 1, title: titleFor(tab.kind, path) };
    });
  },
  recordInteraction(entry: InteractionHistoryEntry) {
    tabsStore.setState((state) => {
      const current = state.interactionHistory[state.interactionHistoryIndex];
      if (
        current?.activeTabId === entry.activeTabId
        && current.path === entry.path
        && current.selectedTreeItemId === entry.selectedTreeItemId
      ) return state;
      const interactionHistory = [
        ...state.interactionHistory.slice(0, state.interactionHistoryIndex + 1),
        entry,
      ];
      return {
        ...state,
        interactionHistory,
        interactionHistoryIndex: interactionHistory.length - 1,
      };
    });
  },
  goBackInteraction(): InteractionHistoryEntry | null {
    let entry: InteractionHistoryEntry | null = null;
    tabsStore.setState((state) => {
      const interactionHistoryIndex = Math.max(0, state.interactionHistoryIndex - 1);
      entry = state.interactionHistory[interactionHistoryIndex] ?? null;
      return entry
        ? { ...state, activeTabId: entry.activeTabId, interactionHistoryIndex }
        : state;
    });
    return entry;
  },
  goForwardInteraction(): InteractionHistoryEntry | null {
    let entry: InteractionHistoryEntry | null = null;
    tabsStore.setState((state) => {
      const interactionHistoryIndex = Math.min(
        state.interactionHistory.length - 1,
        state.interactionHistoryIndex + 1,
      );
      entry = state.interactionHistory[interactionHistoryIndex] ?? null;
      return entry
        ? { ...state, activeTabId: entry.activeTabId, interactionHistoryIndex }
        : state;
    });
    return entry;
  },
};

export function activePath(tab: WorkspaceTab): string {
  return tab.history[tab.historyIndex] ?? '';
}

function createEmptyState(): TabsState {
  return {
    activeTabId: '',
    interactionHistory: [],
    interactionHistoryIndex: 0,
    tabs: [],
  };
}

function createInitialState(connectionId: string): TabsState {
  return {
    activeTabId: 'tab-firestore',
    interactionHistory: [{
      activeTabId: 'tab-firestore',
      path: 'orders',
      selectedTreeItemId: null,
    }],
    interactionHistoryIndex: 0,
    tabs: [
      createFixedTab('tab-firestore', 'firestore-query', connectionId, 'orders'),
      createFixedTab('tab-auth', 'auth-users', connectionId, 'auth/users'),
      createFixedTab('tab-js', 'js-query', connectionId, 'scripts/default'),
    ],
  };
}

function keepActiveTab(activeTabId: string, tabs: ReadonlyArray<WorkspaceTab>): string {
  if (tabs.some((tab) => tab.id === activeTabId)) return activeTabId;
  return tabs[0]?.id ?? '';
}

function compareTabsByProject(left: WorkspaceTab, right: WorkspaceTab): number {
  const project = left.connectionId.localeCompare(right.connectionId);
  if (project !== 0) return project;
  return left.title.localeCompare(right.title);
}

function createTab(input: OpenTabInput): WorkspaceTab {
  tabCounter += 1;
  const path = input.path ?? defaultPathFor(input.kind);
  return createFixedTab(`tab-${input.kind}-${tabCounter}`, input.kind, input.connectionId, path);
}

function createFixedTab(
  id: string,
  kind: WorkspaceTabKind,
  connectionId: string,
  path: string,
): WorkspaceTab {
  return {
    id,
    kind,
    connectionId,
    title: titleFor(kind, path),
    history: [path],
    historyIndex: 0,
    inspectorWidth: DEFAULT_INSPECTOR_WIDTH,
  };
}

function normalizeTab(tab: WorkspaceTab): WorkspaceTab {
  const history = tab.history.length ? tab.history : [defaultPathFor(tab.kind)];
  const historyIndex = clampIndex(tab.historyIndex, history);
  return {
    ...tab,
    history,
    historyIndex,
    inspectorWidth: Number.isFinite(tab.inspectorWidth)
      ? tab.inspectorWidth
      : DEFAULT_INSPECTOR_WIDTH,
    title: titleFor(tab.kind, history[historyIndex] ?? ''),
  };
}

function clampIndex(index: number, values: ReadonlyArray<unknown>): number {
  if (!values.length) return 0;
  return Math.min(values.length - 1, Math.max(0, Math.trunc(index)));
}

function tabCounterFor(tab: WorkspaceTab): number {
  const match = /-(\d+)$/.exec(tab.id);
  return match ? Number(match[1]) || 0 : 0;
}

function updateTab(tabId: string, updater: (tab: WorkspaceTab) => WorkspaceTab) {
  tabsStore.setState((state) => ({
    ...state,
    tabs: state.tabs.map((tab) => tab.id === tabId ? updater(tab) : tab),
  }));
}

function defaultPathFor(kind: WorkspaceTabKind): string {
  if (kind === 'firestore-query') return 'orders';
  if (kind === 'auth-users') return 'auth/users';
  return 'scripts/default';
}

function titleFor(kind: WorkspaceTabKind, path: string): string {
  if (kind === 'firestore-query') return path || 'Firestore';
  if (kind === 'auth-users') return 'Auth';
  return 'JS Query';
}
