import type { BackgroundJob, BackgroundJobEvent } from '@firebase-desk/repo-contracts/jobs';
import type { JobsState } from './jobsState.ts';

export function jobsLoadStarted(state: JobsState): JobsState {
  return { ...state, errorMessage: null, isLoading: true };
}

export function jobsLoadSucceeded(
  state: JobsState,
  jobs: ReadonlyArray<BackgroundJob>,
): JobsState {
  const acknowledgedIssueJobIds = state.open
    ? issueJobIds(jobs)
    : pruneAcknowledgedIssueJobIds(state.acknowledgedIssueJobIds, jobs);
  return { ...state, acknowledgedIssueJobIds, errorMessage: null, isLoading: false, jobs };
}

export function jobsLoadFailed(state: JobsState, message: string): JobsState {
  return { ...state, errorMessage: message, isLoading: false };
}

export function jobsDrawerOpened(state: JobsState): JobsState {
  return { ...state, acknowledgedIssueJobIds: issueJobIds(state.jobs), open: true };
}

export function jobsDrawerClosed(state: JobsState): JobsState {
  return { ...state, open: false };
}

export function jobsDrawerToggled(state: JobsState): JobsState {
  return state.open ? jobsDrawerClosed(state) : jobsDrawerOpened(state);
}

export function jobsExpandedChanged(state: JobsState, expanded: boolean): JobsState {
  return { ...state, expanded };
}

export function jobsEventReceived(state: JobsState, event: BackgroundJobEvent): JobsState {
  if (event.type === 'job-removed') {
    const jobs = state.jobs.filter((job) => job.id !== event.id);
    return {
      ...state,
      acknowledgedIssueJobIds: state.acknowledgedIssueJobIds.filter((id) => id !== event.id),
      jobs,
    };
  }
  const exists = state.jobs.some((job) => job.id === event.job.id);
  const jobs = exists
    ? state.jobs.map((job) => job.id === event.job.id ? event.job : job)
    : [event.job, ...state.jobs];
  const acknowledgedIssueJobIds = state.open && isIssueJob(event.job)
    ? unique([...state.acknowledgedIssueJobIds, event.job.id])
    : pruneAcknowledgedIssueJobIds(state.acknowledgedIssueJobIds, jobs);
  return {
    ...state,
    acknowledgedIssueJobIds,
    jobs,
  };
}

function issueJobIds(jobs: ReadonlyArray<BackgroundJob>): string[] {
  return jobs.filter(isIssueJob).map((job) => job.id);
}

function isIssueJob(job: BackgroundJob): boolean {
  return job.status === 'failed' || job.status === 'interrupted';
}

function pruneAcknowledgedIssueJobIds(
  ids: ReadonlyArray<string>,
  jobs: ReadonlyArray<BackgroundJob>,
): string[] {
  const issueIds = new Set(issueJobIds(jobs));
  return ids.filter((id) => issueIds.has(id));
}

function unique(values: ReadonlyArray<string>): string[] {
  return Array.from(new Set(values));
}
