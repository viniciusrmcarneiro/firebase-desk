import type { BackgroundJob } from '@firebase-desk/repo-contracts/jobs';
import type { JobsState } from './jobsState.ts';

export interface JobsButtonModel {
  readonly badge: {
    readonly label: string;
    readonly variant: 'danger' | 'neutral' | 'warning';
  } | null;
  readonly variant: 'ghost' | 'secondary' | 'warning';
}

export function selectJobsButtonModel(state: JobsState): JobsButtonModel {
  const activeCount =
    state.jobs.filter((job) => job.status === 'queued' || job.status === 'running').length;
  const acknowledgedIssueIds = new Set(state.acknowledgedIssueJobIds);
  const failedCount =
    state.jobs.filter((job) =>
      (job.status === 'failed' || job.status === 'interrupted')
      && !acknowledgedIssueIds.has(job.id)
    ).length;
  if (failedCount > 0) {
    return { badge: { label: String(failedCount), variant: 'danger' }, variant: 'warning' };
  }
  if (activeCount > 0) {
    return { badge: { label: String(activeCount), variant: 'warning' }, variant: 'secondary' };
  }
  return { badge: null, variant: state.open ? 'secondary' : 'ghost' };
}

export function latestActiveJob(jobs: ReadonlyArray<BackgroundJob>): BackgroundJob | null {
  return jobs.find((job) => job.status === 'running' || job.status === 'queued') ?? null;
}
