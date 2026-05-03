import type { BackgroundJob } from '@firebase-desk/repo-contracts/jobs';

export interface JobsState {
  readonly errorMessage: string | null;
  readonly expanded: boolean;
  readonly isLoading: boolean;
  readonly jobs: ReadonlyArray<BackgroundJob>;
  readonly open: boolean;
}

export function createInitialJobsState(input: Partial<JobsState> = {}): JobsState {
  return {
    errorMessage: null,
    expanded: false,
    isLoading: false,
    jobs: [],
    open: false,
    ...input,
  };
}
