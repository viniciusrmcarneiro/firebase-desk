import {
  type BackgroundJob,
  type BackgroundJobEvent,
  type BackgroundJobListRequest,
  type BackgroundJobPickFileResult,
  type BackgroundJobRepository,
  EMPTY_BACKGROUND_JOB_PROGRESS,
  type FirestoreCollectionJobRequest,
  type FirestoreExportFormat,
} from '@firebase-desk/repo-contracts/jobs';

export class MockBackgroundJobRepository implements BackgroundJobRepository {
  private jobs: BackgroundJob[] = [];
  private readonly listeners = new Set<(event: BackgroundJobEvent) => void>();
  private nextId = 1;

  async acknowledgeIssues(ids: ReadonlyArray<string>): Promise<void> {
    const idSet = new Set(ids);
    const acknowledgedAt = now();
    const updated: BackgroundJob[] = [];
    this.jobs = this.jobs.map((job) => {
      if (!idSet.has(job.id) || !isIssue(job.status) || job.acknowledgedAt) return job;
      const acknowledged = { ...job, acknowledgedAt, updatedAt: acknowledgedAt };
      updated.push(acknowledged);
      return acknowledged;
    });
    for (const job of updated) this.emit({ job: cloneJob(job), type: 'job-updated' });
  }

  async cancel(id: string): Promise<void> {
    const job = this.jobs.find((entry) => entry.id === id);
    if (!job || isFinal(job.status)) return;
    const updated = {
      ...job,
      cancelRequested: true,
      finishedAt: now(),
      status: 'cancelled' as const,
      summary: 'Job cancelled.',
      updatedAt: now(),
    };
    this.replace(updated);
    this.emit({ job: cloneJob(updated), type: 'job-updated' });
  }

  async clearCompleted(): Promise<void> {
    const removed = this.jobs.filter((job) => isFinal(job.status)).map((job) => job.id);
    this.jobs = this.jobs.filter((job) => !isFinal(job.status));
    for (const id of removed) this.emit({ id, type: 'job-removed' });
  }

  async list(request?: BackgroundJobListRequest): Promise<ReadonlyArray<BackgroundJob>> {
    const filtered = request?.status && request.status !== 'all'
      ? this.jobs.filter((job) => job.status === request.status)
      : this.jobs;
    return filtered.slice(0, request?.limit ?? filtered.length).map(cloneJob);
  }

  async pickExportFile(format: FirestoreExportFormat): Promise<BackgroundJobPickFileResult> {
    return { canceled: false, filePath: `/tmp/firebase-desk-export.${format}` };
  }

  async pickImportFile(): Promise<BackgroundJobPickFileResult> {
    return { canceled: false, filePath: '/tmp/firebase-desk-import.jsonl' };
  }

  async start(request: FirestoreCollectionJobRequest): Promise<BackgroundJob> {
    const createdAt = now();
    const job: BackgroundJob = {
      createdAt,
      finishedAt: createdAt,
      id: `mock-job-${this.nextId++}`,
      progress: {
        ...EMPTY_BACKGROUND_JOB_PROGRESS,
        read: request.type === 'firestore.importCollection' ? 1 : 3,
        written: isWriteJob(request) ? 3 : 0,
        deleted: request.type === 'firestore.deleteCollection' ? 3 : 0,
      },
      request,
      status: 'succeeded',
      summary: 'Mock job completed.',
      title: titleFor(request),
      type: request.type,
      updatedAt: createdAt,
    };
    this.jobs = [cloneJob(job), ...this.jobs];
    this.emit({ job: cloneJob(job), type: 'job-added' });
    this.emit({ job: cloneJob(job), type: 'job-updated' });
    return cloneJob(job);
  }

  subscribe(listener: (event: BackgroundJobEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private replace(job: BackgroundJob): void {
    this.jobs = this.jobs.map((entry) => entry.id === job.id ? cloneJob(job) : entry);
  }

  private emit(event: BackgroundJobEvent): void {
    for (const listener of Array.from(this.listeners)) listener(event);
  }
}

function titleFor(request: FirestoreCollectionJobRequest): string {
  switch (request.type) {
    case 'firestore.copyCollection':
      return 'Copy collection';
    case 'firestore.deleteCollection':
      return 'Delete collection';
    case 'firestore.duplicateCollection':
      return 'Duplicate collection';
    case 'firestore.exportCollection':
      return 'Export collection';
    case 'firestore.importCollection':
      return 'Import collection';
  }
}

function isWriteJob(request: FirestoreCollectionJobRequest): boolean {
  return request.type === 'firestore.copyCollection'
    || request.type === 'firestore.duplicateCollection'
    || request.type === 'firestore.importCollection';
}

function isFinal(status: BackgroundJob['status']): boolean {
  return status === 'cancelled'
    || status === 'failed'
    || status === 'interrupted'
    || status === 'succeeded';
}

function isIssue(status: BackgroundJob['status']): boolean {
  return status === 'failed' || status === 'interrupted';
}

function cloneJob(job: BackgroundJob): BackgroundJob {
  return JSON.parse(JSON.stringify(job)) as BackgroundJob;
}

function now(): string {
  return new Date().toISOString();
}
