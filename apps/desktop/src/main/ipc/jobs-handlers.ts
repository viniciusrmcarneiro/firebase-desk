import type { BackgroundJobRepository } from '@firebase-desk/repo-contracts/jobs';
import type { IpcHandlerMap } from './handler-types.ts';

export function createJobsHandlers(
  jobsRepository: BackgroundJobRepository,
): Pick<
  IpcHandlerMap,
  | 'jobs.cancel'
  | 'jobs.clearCompleted'
  | 'jobs.list'
  | 'jobs.pickExportFile'
  | 'jobs.pickImportFile'
  | 'jobs.start'
> {
  return {
    'jobs.cancel': async ({ id }) => {
      await jobsRepository.cancel(id);
    },
    'jobs.clearCompleted': async () => {
      await jobsRepository.clearCompleted();
    },
    'jobs.list': async (request) => Array.from(await jobsRepository.list(request)),
    'jobs.pickExportFile': ({ format }) => jobsRepository.pickExportFile(format),
    'jobs.pickImportFile': () => jobsRepository.pickImportFile(),
    'jobs.start': (request) => jobsRepository.start(request),
  };
}
