import type {
  BackgroundJobRepository,
  FirestoreCollectionJobRequest,
} from '@firebase-desk/repo-contracts/jobs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { messageFromError } from '../shared/errors.ts';
import { useAppCoreStore } from '../shared/reactStore.ts';
import { selectJobsButtonModel } from './jobsSelectors.ts';
import { createJobsStore, type JobsStore } from './jobsStore.ts';
import {
  jobsDrawerClosed,
  jobsDrawerOpened,
  jobsDrawerToggled,
  jobsEventReceived,
  jobsExpandedChanged,
  jobsLoadFailed,
  jobsLoadStarted,
  jobsLoadSucceeded,
} from './jobsTransitions.ts';

export interface UseJobsControllerInput {
  readonly onStatus?: ((message: string) => void) | undefined;
  readonly repository: BackgroundJobRepository;
  readonly store?: JobsStore | undefined;
}

export function useJobsController(
  { onStatus, repository, store: inputStore }: UseJobsControllerInput,
) {
  const [ownedStore] = useState(createJobsStore);
  const store = inputStore ?? ownedStore;
  const state = useAppCoreStore(store);

  const load = useCallback(() => {
    store.update(jobsLoadStarted);
    repository.list({ limit: 200 })
      .then((jobs) => store.update((current) => jobsLoadSucceeded(current, jobs)))
      .catch((error: unknown) => {
        const message = messageFromError(error, 'Could not load jobs.');
        store.update((current) => jobsLoadFailed(current, message));
        onStatus?.(message);
      });
  }, [onStatus, repository, store]);

  useEffect(() => {
    load();
    return repository.subscribe((event) => {
      store.update((current) => jobsEventReceived(current, event));
      if (event.type === 'job-updated' && isFinalStatus(event.job.status)) {
        onStatus?.(event.job.summary ?? event.job.status);
      }
    });
  }, [load, onStatus, repository, store]);

  const button = useMemo(() => selectJobsButtonModel(state), [state]);

  const start = useCallback(async (request: FirestoreCollectionJobRequest) => {
    const job = await repository.start(request);
    onStatus?.(`Queued ${job.title.toLowerCase()}`);
    return job;
  }, [onStatus, repository]);

  const cancel = useCallback((id: string) => {
    void repository.cancel(id).catch((error: unknown) => {
      onStatus?.(messageFromError(error, 'Could not cancel job.'));
    });
  }, [onStatus, repository]);

  const clearCompleted = useCallback(() => {
    void repository.clearCompleted().catch((error: unknown) => {
      onStatus?.(messageFromError(error, 'Could not clear completed jobs.'));
    });
  }, [onStatus, repository]);

  return {
    button,
    cancel,
    clearCompleted,
    close: () => store.update(jobsDrawerClosed),
    expanded: state.expanded,
    isLoading: state.isLoading,
    jobs: state.jobs,
    load,
    open: () => store.update(jobsDrawerOpened),
    opened: state.open,
    setExpanded: (expanded: boolean) =>
      store.update((current) => jobsExpandedChanged(current, expanded)),
    start,
    state,
    toggle: () => store.update(jobsDrawerToggled),
  };
}

function isFinalStatus(status: string): boolean {
  return status === 'cancelled'
    || status === 'failed'
    || status === 'interrupted'
    || status === 'succeeded';
}
