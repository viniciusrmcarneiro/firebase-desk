import type {
  ActivityLogArea,
  ActivityLogEntry,
  ActivityLogListRequest,
  ActivityLogStatus,
} from '@firebase-desk/repo-contracts';

export const ACTIVITY_LIST_LIMIT = 200;

export interface ActivityFilters {
  readonly area: ActivityLogArea | 'all';
  readonly search: string;
  readonly status: ActivityLogStatus | 'all';
}

export interface ActivityState {
  readonly entries: ReadonlyArray<ActivityLogEntry>;
  readonly expanded: boolean;
  readonly filters: ActivityFilters;
  readonly isLoading: boolean;
  readonly lastErrorMessage: string | null;
  readonly open: boolean;
  readonly unreadIssue: ActivityLogEntry | null;
}

export function createInitialActivityFilters(): ActivityFilters {
  return {
    area: 'all',
    search: '',
    status: 'all',
  };
}

export function createInitialActivityState(
  overrides: Partial<ActivityState> = {},
): ActivityState {
  return {
    entries: [],
    expanded: false,
    filters: createInitialActivityFilters(),
    isLoading: false,
    lastErrorMessage: null,
    open: false,
    unreadIssue: null,
    ...overrides,
  };
}

export function activityListRequestFromFilters(
  filters: ActivityFilters,
  limit = ACTIVITY_LIST_LIMIT,
): ActivityLogListRequest {
  return {
    area: filters.area,
    limit,
    search: filters.search.trim() || undefined,
    status: filters.status,
  };
}

export function activityEntryMatchesRequest(
  entry: ActivityLogEntry,
  request: ActivityLogListRequest,
): boolean {
  if (request.area && request.area !== 'all' && entry.area !== request.area) return false;
  if (request.status && request.status !== 'all' && entry.status !== request.status) return false;
  const search = request.search?.trim().toLowerCase();
  if (!search) return true;
  return [
    entry.action,
    entry.area,
    entry.status,
    entry.summary,
    entry.target?.label,
    entry.target?.path,
    entry.target?.uid,
    entry.error?.message,
  ].some((value) => value?.toLowerCase().includes(search));
}

export function isActivityIssue(entry: ActivityLogEntry): boolean {
  return entry.status === 'failure' || entry.status === 'conflict';
}

export function activityIssueFromLatestEntry(
  entries: ReadonlyArray<ActivityLogEntry>,
): ActivityLogEntry | null {
  const latest = entries[0];
  return latest && isActivityIssue(latest) ? latest : null;
}
