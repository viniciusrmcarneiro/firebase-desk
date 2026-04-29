import { FirestoreFilterOpSchema } from '@firebase-desk/ipc-schemas';
import type { FirestoreQueryDraft, FirestoreQueryFilterDraft } from '@firebase-desk/repo-contracts';
import { z } from 'zod';
import {
  type InteractionHistoryEntry,
  type TabsState,
  WORKSPACE_TAB_KINDS,
  type WorkspaceTab,
} from './stores/tabsStore.ts';

export const WORKSPACE_STATE_STORAGE_KEY = 'firebase-desk.workspace.v1';

const WorkspaceTabKindSchema = z.enum(WORKSPACE_TAB_KINDS);

const WorkspaceTabSchema = z.object({
  id: z.string().min(1),
  kind: WorkspaceTabKindSchema,
  title: z.string(),
  connectionId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  history: z.array(z.string()).min(1),
  historyIndex: z.number().int().nonnegative(),
  inspectorWidth: z.number().finite().nonnegative(),
}).superRefine((tab, context) => {
  if (!tab.connectionId && !tab.projectId) {
    context.addIssue({ code: 'custom', message: 'Tab connection id is required' });
  }
  if (tab.historyIndex >= tab.history.length) {
    context.addIssue({ code: 'custom', message: 'Tab history index out of range' });
  }
}).transform((tab): WorkspaceTab => ({
  id: tab.id,
  kind: tab.kind,
  title: tab.title,
  connectionId: tab.connectionId ?? tab.projectId ?? '',
  history: tab.history,
  historyIndex: tab.historyIndex,
  inspectorWidth: tab.inspectorWidth,
}));

const InteractionHistoryEntrySchema = z.object({
  activeTabId: z.string().min(1),
  path: z.string().optional(),
  selectedTreeItemId: z.string().nullable(),
}).transform((entry): InteractionHistoryEntry => ({
  activeTabId: entry.activeTabId,
  ...(entry.path === undefined ? {} : { path: entry.path }),
  selectedTreeItemId: entry.selectedTreeItemId,
}));

const TabsStateSchema = z.object({
  activeTabId: z.string(),
  interactionHistory: z.array(InteractionHistoryEntrySchema),
  interactionHistoryIndex: z.number().int().nonnegative(),
  tabs: z.array(WorkspaceTabSchema).min(1),
}).superRefine((state, context) => {
  const tabIds = new Set(state.tabs.map((tab) => tab.id));
  if (tabIds.size !== state.tabs.length) {
    context.addIssue({ code: 'custom', message: 'Duplicate tab ids' });
  }
  if (!tabIds.has(state.activeTabId)) {
    context.addIssue({ code: 'custom', message: 'Active tab is not open' });
  }
  if (state.interactionHistoryIndex >= state.interactionHistory.length) {
    context.addIssue({ code: 'custom', message: 'Interaction index out of range' });
  }
  for (const entry of state.interactionHistory) {
    if (!tabIds.has(entry.activeTabId)) {
      context.addIssue({ code: 'custom', message: 'Interaction tab is not open' });
    }
  }
}).transform((state): TabsState => state);

const FirestoreQueryFilterDraftSchema = z.object({
  id: z.string().min(1),
  field: z.string(),
  op: FirestoreFilterOpSchema,
  value: z.string(),
}) satisfies z.ZodType<FirestoreQueryFilterDraft>;

const FirestoreQueryDraftSchema = z.object({
  path: z.string(),
  filters: z.array(FirestoreQueryFilterDraftSchema).optional(),
  filterField: z.string(),
  filterOp: FirestoreFilterOpSchema,
  filterValue: z.string(),
  sortField: z.string(),
  sortDirection: z.enum(['asc', 'desc']),
  limit: z.number().int().positive(),
}).transform((draft): FirestoreQueryDraft => ({
  path: draft.path,
  ...(draft.filters === undefined ? {} : { filters: draft.filters }),
  filterField: draft.filterField,
  filterOp: draft.filterOp,
  filterValue: draft.filterValue,
  sortField: draft.sortField,
  sortDirection: draft.sortDirection,
  limit: draft.limit,
}));

export const PersistedWorkspaceStateSchema = z.object({
  version: z.literal(1),
  authFilter: z.string(),
  drafts: z.record(z.string(), FirestoreQueryDraftSchema),
  scripts: z.record(z.string(), z.string()),
  tabsState: TabsStateSchema,
}).superRefine((state, context) => {
  const tabIds = new Set(state.tabsState.tabs.map((tab) => tab.id));
  for (const tabId of Object.keys(state.drafts)) {
    if (!tabIds.has(tabId)) context.addIssue({ code: 'custom', message: 'Draft tab is not open' });
  }
  for (const tabId of Object.keys(state.scripts)) {
    if (!tabIds.has(tabId)) context.addIssue({ code: 'custom', message: 'Script tab is not open' });
  }
});

export type PersistedWorkspaceState = z.infer<typeof PersistedWorkspaceStateSchema>;

export function loadPersistedWorkspaceState(): PersistedWorkspaceState | null {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = PersistedWorkspaceStateSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function savePersistedWorkspaceState(
  state: Omit<PersistedWorkspaceState, 'version'>,
): void {
  try {
    if (!state.tabsState.tabs.length) {
      window.localStorage.removeItem(WORKSPACE_STATE_STORAGE_KEY);
      return;
    }
    const tabIds = new Set(state.tabsState.tabs.map((tab) => tab.id));
    const payload = PersistedWorkspaceStateSchema.parse({
      version: 1,
      authFilter: state.authFilter,
      drafts: pickTabRecord(state.drafts, tabIds),
      scripts: pickTabRecord(state.scripts, tabIds),
      tabsState: state.tabsState,
    });
    window.localStorage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Best effort only.
  }
}

function pickTabRecord<T>(
  values: Readonly<Record<string, T>>,
  tabIds: ReadonlySet<string>,
): Readonly<Record<string, T>> {
  const picked: Record<string, T> = {};
  for (const [tabId, value] of Object.entries(values)) {
    if (tabIds.has(tabId)) picked[tabId] = value;
  }
  return picked;
}
