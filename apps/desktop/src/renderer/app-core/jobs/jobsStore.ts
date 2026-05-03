import { type AppCoreStore, createAppCoreStore } from '../shared/store.ts';
import { createInitialJobsState, type JobsState } from './jobsState.ts';

export type JobsStore = AppCoreStore<JobsState>;

export function createJobsStore(initialState: JobsState = createInitialJobsState()): JobsStore {
  return createAppCoreStore(initialState);
}
