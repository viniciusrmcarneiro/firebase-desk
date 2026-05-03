import type {
  BackgroundJob,
  BackgroundJobEvent,
  BackgroundJobListRequest,
  BackgroundJobPickFileResult,
  BackgroundJobRepository,
  FirestoreCollectionJobRequest,
  FirestoreExportFormat,
} from '@firebase-desk/repo-contracts/jobs';

export class IpcBackgroundJobRepository implements BackgroundJobRepository {
  async acknowledgeIssues(ids: ReadonlyArray<string>): Promise<void> {
    await window.firebaseDesk.jobs.acknowledgeIssues({ ids: Array.from(ids) });
  }

  async cancel(id: string): Promise<void> {
    await window.firebaseDesk.jobs.cancel({ id });
  }

  async clearCompleted(): Promise<void> {
    await window.firebaseDesk.jobs.clearCompleted();
  }

  async list(request: BackgroundJobListRequest = {}): Promise<ReadonlyArray<BackgroundJob>> {
    return await window.firebaseDesk.jobs.list(request);
  }

  async pickExportFile(format: FirestoreExportFormat): Promise<BackgroundJobPickFileResult> {
    return await window.firebaseDesk.jobs.pickExportFile({ format });
  }

  async pickImportFile(): Promise<BackgroundJobPickFileResult> {
    return await window.firebaseDesk.jobs.pickImportFile();
  }

  async start(request: FirestoreCollectionJobRequest): Promise<BackgroundJob> {
    return await window.firebaseDesk.jobs.start(request);
  }

  subscribe(listener: (event: BackgroundJobEvent) => void): () => void {
    return window.firebaseDesk.jobs.subscribe(listener);
  }
}
