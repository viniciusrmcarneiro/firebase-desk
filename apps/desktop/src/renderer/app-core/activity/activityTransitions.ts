import type {
  ActivityLogArea,
  ActivityLogEntry,
  ActivityLogStatus,
} from '@firebase-desk/repo-contracts';
import {
  ACTIVITY_LIST_LIMIT,
  activityEntryMatchesRequest,
  activityIssueFromLatestEntry,
  activityListRequestFromFilters,
  type ActivityState,
  isActivityIssue,
} from './activityState.ts';

export function activityOpened(state: ActivityState): ActivityState {
  return { ...state, lastErrorMessage: null, open: true, unreadIssue: null };
}

export function activityClosed(state: ActivityState): ActivityState {
  return { ...state, open: false };
}

export function activityExpandedChanged(
  state: ActivityState,
  expanded: boolean,
): ActivityState {
  return { ...state, expanded };
}

export function activityFiltersChanged(
  state: ActivityState,
  filters: Partial<{
    readonly area: ActivityLogArea | 'all';
    readonly search: string;
    readonly status: ActivityLogStatus | 'all';
  }>,
): ActivityState {
  return {
    ...state,
    filters: {
      ...state.filters,
      ...filters,
    },
  };
}

export function activityLoadStarted(state: ActivityState): ActivityState {
  return { ...state, isLoading: true, lastErrorMessage: null };
}

export function activityLoadSucceeded(
  state: ActivityState,
  entries: ReadonlyArray<ActivityLogEntry>,
): ActivityState {
  return { ...state, entries, isLoading: false, lastErrorMessage: null };
}

export function activityLoadFailed(state: ActivityState, message: string): ActivityState {
  return { ...state, isLoading: false, lastErrorMessage: message };
}

export function activityIssuePreviewLoaded(
  state: ActivityState,
  entries: ReadonlyArray<ActivityLogEntry>,
): ActivityState {
  return { ...state, unreadIssue: activityIssueFromLatestEntry(entries) };
}

export function activityRecorded(
  state: ActivityState,
  entry: ActivityLogEntry,
): ActivityState {
  const nextEntries = state.open
      && activityEntryMatchesRequest(entry, activityListRequestFromFilters(state.filters))
    ? [entry, ...state.entries].slice(0, ACTIVITY_LIST_LIMIT)
    : state.entries;
  return {
    ...state,
    entries: nextEntries,
    unreadIssue: !state.open && isActivityIssue(entry) ? entry : state.unreadIssue,
  };
}

export function activityCleared(state: ActivityState): ActivityState {
  return { ...state, entries: [], lastErrorMessage: null, unreadIssue: null };
}

export function activityExportFailed(state: ActivityState, message: string): ActivityState {
  return { ...state, lastErrorMessage: message };
}
