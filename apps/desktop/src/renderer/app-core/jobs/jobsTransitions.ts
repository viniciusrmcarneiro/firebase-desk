import type { BackgroundJob, BackgroundJobEvent } from '@firebase-desk/repo-contracts/jobs';
import type { JobsState } from './jobsState.ts';

export function jobsLoadStarted(state: JobsState): JobsState {
  return { ...state, errorMessage: null, isLoading: true };
}

export function jobsLoadSucceeded(
  state: JobsState,
  jobs: ReadonlyArray<BackgroundJob>,
): JobsState {
  return { ...state, errorMessage: null, isLoading: false, jobs };
}

export function jobsLoadFailed(state: JobsState, message: string): JobsState {
  return { ...state, errorMessage: message, isLoading: false };
}

export function jobsDrawerOpened(state: JobsState): JobsState {
  return { ...state, open: true };
}

export function jobsDrawerClosed(state: JobsState): JobsState {
  return { ...state, open: false };
}

export function jobsDrawerToggled(state: JobsState): JobsState {
  return { ...state, open: !state.open };
}

export function jobsExpandedChanged(state: JobsState, expanded: boolean): JobsState {
  return { ...state, expanded };
}

export function jobsEventReceived(state: JobsState, event: BackgroundJobEvent): JobsState {
  if (event.type === 'job-removed') {
    return { ...state, jobs: state.jobs.filter((job) => job.id !== event.id) };
  }
  const exists = state.jobs.some((job) => job.id === event.job.id);
  return {
    ...state,
    jobs: exists
      ? state.jobs.map((job) => job.id === event.job.id ? event.job : job)
      : [event.job, ...state.jobs],
  };
}
