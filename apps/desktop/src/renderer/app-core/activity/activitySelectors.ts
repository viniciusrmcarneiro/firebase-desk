import type { ActivityLogEntry, ActivityLogStatus } from '@firebase-desk/repo-contracts';
import { activityListRequestFromFilters, type ActivityState } from './activityState.ts';

export interface ActivityDrawerModel {
  readonly area: ActivityState['filters']['area'];
  readonly entries: ReadonlyArray<ActivityLogEntry>;
  readonly expanded: boolean;
  readonly isLoading: boolean;
  readonly open: boolean;
  readonly search: string;
  readonly status: ActivityState['filters']['status'];
}

export interface ActivityButtonModel {
  readonly badge: {
    readonly label: ActivityLogStatus;
    readonly variant: 'danger' | 'neutral' | 'warning';
  } | null;
  readonly variant: 'danger' | 'secondary' | 'warning';
}

export function selectActivityDrawerModel(state: ActivityState): ActivityDrawerModel {
  return {
    area: state.filters.area,
    entries: state.entries,
    expanded: state.expanded,
    isLoading: state.isLoading,
    open: state.open,
    search: state.filters.search,
    status: state.filters.status,
  };
}

export function selectActivityUnreadIssue(state: ActivityState): ActivityLogEntry | null {
  return state.unreadIssue;
}

export function selectActivityListRequest(state: ActivityState) {
  return activityListRequestFromFilters(state.filters);
}

export function selectActivityButtonModel(state: ActivityState): ActivityButtonModel {
  const issue = selectActivityUnreadIssue(state);
  if (!issue) return { badge: null, variant: 'secondary' };
  return {
    badge: {
      label: issue.status,
      variant: activityIssueBadgeVariant(issue.status),
    },
    variant: activityButtonVariant(issue),
  };
}

function activityButtonVariant(
  entry: ActivityLogEntry | null,
): 'danger' | 'secondary' | 'warning' {
  if (entry?.status === 'failure') return 'danger';
  if (entry?.status === 'conflict') return 'warning';
  return 'secondary';
}

function activityIssueBadgeVariant(status: ActivityLogStatus): 'danger' | 'neutral' | 'warning' {
  if (status === 'failure') return 'danger';
  if (status === 'conflict') return 'warning';
  return 'neutral';
}
