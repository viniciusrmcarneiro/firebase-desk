import type { ActivityLogRepository } from '@firebase-desk/repo-contracts';
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
import { dialog } from 'electron';
import { randomUUID } from 'node:crypto';
import type { JobsStore } from '../storage/jobs-store.ts';
import {
  type FirestoreCollectionJobRunner,
  type JobCancellationSignal,
  JobCancelledError,
} from './firestore-collection-job-runner.ts';

interface RunningJob {
  readonly id: string;
  cancelRequested: boolean;
}

export class MainBackgroundJobRepository implements BackgroundJobRepository {
  private readonly listeners = new Set<(event: BackgroundJobEvent) => void>();
  private draining = false;
  private running: RunningJob | null = null;

  constructor(
    private readonly store: JobsStore,
    private readonly runner: FirestoreCollectionJobRunner,
    private readonly activity: ActivityLogRepository,
    private readonly now = () => new Date().toISOString(),
    private readonly randomId: () => string = randomUUID,
  ) {}

  async initialize(): Promise<void> {
    const interrupted = await this.store.interruptActive(this.now());
    await Promise.all(interrupted.map(async (job) => {
      this.emit({ job, type: 'job-updated' });
      await this.recordFinalActivity(job);
    }));
    void this.drainQueue();
  }

  async acknowledgeIssues(ids: ReadonlyArray<string>): Promise<void> {
    const updated = await this.store.acknowledgeIssues(ids, this.now());
    for (const job of updated) this.emit({ job, type: 'job-updated' });
  }

  async cancel(id: string): Promise<void> {
    const running = this.running;
    if (running?.id === id) {
      running.cancelRequested = true;
      const updated = await this.store.update(id, (job) => ({
        ...job,
        cancelRequested: true,
        updatedAt: this.now(),
      }));
      if (updated) this.emit({ job: updated, type: 'job-updated' });
      return;
    }
    const updated = await this.store.update(id, (job) => {
      if (job.status !== 'queued') return job;
      const now = this.now();
      return {
        ...job,
        cancelRequested: true,
        finishedAt: now,
        status: 'cancelled',
        summary: 'Job cancelled before it started.',
        updatedAt: now,
      };
    });
    if (updated) {
      this.emit({ job: updated, type: 'job-updated' });
      if (updated.status === 'cancelled') await this.recordFinalActivity(updated);
    }
  }

  async clearCompleted(): Promise<void> {
    const removed = await this.store.clearCompleted();
    for (const id of removed) this.emit({ id, type: 'job-removed' });
  }

  async list(request?: BackgroundJobListRequest): Promise<ReadonlyArray<BackgroundJob>> {
    return await this.store.list(request);
  }

  async pickExportFile(format: FirestoreExportFormat): Promise<BackgroundJobPickFileResult> {
    if (process.env['FIREBASE_DESK_JOB_EXPORT_PATH']) {
      return { canceled: false, filePath: process.env['FIREBASE_DESK_JOB_EXPORT_PATH'] };
    }
    const result = await dialog.showSaveDialog({
      defaultPath: `firebase-desk-export.${format}`,
      filters: format === 'csv'
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : [{ name: 'JSON Lines', extensions: ['jsonl'] }],
      title: 'Export collection',
    });
    return result.canceled || !result.filePath
      ? { canceled: true }
      : { canceled: false, filePath: result.filePath };
  }

  async pickImportFile(): Promise<BackgroundJobPickFileResult> {
    if (process.env['FIREBASE_DESK_JOB_IMPORT_PATH']) {
      return { canceled: false, filePath: process.env['FIREBASE_DESK_JOB_IMPORT_PATH'] };
    }
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'JSON Lines', extensions: ['jsonl'] }],
      properties: ['openFile'],
      title: 'Import collection',
    });
    return result.canceled || !result.filePaths[0]
      ? { canceled: true }
      : { canceled: false, filePath: result.filePaths[0] };
  }

  async start(request: FirestoreCollectionJobRequest): Promise<BackgroundJob> {
    const now = this.now();
    const job: BackgroundJob = {
      createdAt: now,
      id: this.randomId(),
      progress: EMPTY_BACKGROUND_JOB_PROGRESS,
      request,
      status: 'queued',
      title: jobTitle(request),
      type: request.type,
      updatedAt: now,
    };
    await this.store.add(job);
    this.emit({ job, type: 'job-added' });
    void this.drainQueue();
    return job;
  }

  subscribe(listener: (event: BackgroundJobEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async drainQueue(): Promise<void> {
    if (this.draining || this.running) return;
    this.draining = true;
    try {
      // oxlint-disable no-await-in-loop -- jobs must run one at a time in FIFO order.
      while (!this.running) {
        const next = await this.store.oldestQueued();
        if (!next) return;
        await this.runJob(next);
      }
      // oxlint-enable no-await-in-loop
    } finally {
      this.draining = false;
    }
  }

  private async runJob(next: BackgroundJob): Promise<void> {
    this.running = { id: next.id, cancelRequested: false };
    const started = await this.updateJob(next.id, (job) => ({
      ...job,
      startedAt: this.now(),
      status: 'running',
      summary: 'Running',
    }));
    if (!started) {
      this.running = null;
      return;
    }
    try {
      const result = await this.runner.run(started, this.signalFor(next.id), {
        update: async (progress) => {
          await this.updateJob(next.id, (job) => ({
            ...job,
            progress: { ...progress },
            summary: progress.currentPath ? `Processing ${progress.currentPath}` : 'Running',
          }));
        },
      });
      const finalStatus = this.running?.cancelRequested ? 'cancelled' : 'succeeded';
      const finished = await this.updateJob(next.id, (job) => ({
        ...job,
        finishedAt: this.now(),
        ...(result ? { result } : {}),
        status: finalStatus,
        summary: finalStatus === 'cancelled' ? 'Job cancelled.' : jobSuccessSummary(job),
      }));
      if (finished) await this.recordFinalActivity(finished);
    } catch (error) {
      const status = error instanceof JobCancelledError ? 'cancelled' : 'failed';
      const finished = await this.updateJob(next.id, (job) => ({
        ...job,
        error: status === 'failed' ? errorInfo(error) : undefined,
        finishedAt: this.now(),
        status,
        summary: status === 'cancelled'
          ? 'Job cancelled.'
          : messageFromError(error, 'Job failed.'),
      }));
      if (finished) await this.recordFinalActivity(finished);
    } finally {
      this.running = null;
    }
  }

  private signalFor(id: string): JobCancellationSignal {
    return {
      isCancelled: () => this.running?.id === id && this.running.cancelRequested,
    };
  }

  private async updateJob(
    id: string,
    update: (job: BackgroundJob) => BackgroundJob,
  ): Promise<BackgroundJob | null> {
    const updated = await this.store.update(
      id,
      (job) => ({ ...update(job), updatedAt: this.now() }),
    );
    if (updated) this.emit({ job: updated, type: 'job-updated' });
    return updated;
  }

  private emit(event: BackgroundJobEvent): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch {
        // Job event subscribers must not break runner progress.
      }
    }
  }

  private async recordFinalActivity(job: BackgroundJob): Promise<void> {
    const targetPath = targetCollectionPath(job.request) ?? sourceCollectionPath(job.request);
    await this.activity.append({
      action: job.title,
      area: 'firestore',
      ...(job.error ? { error: job.error } : {}),
      durationMs: job.startedAt && job.finishedAt
        ? Math.max(0, Date.parse(job.finishedAt) - Date.parse(job.startedAt))
        : undefined,
      metadata: {
        collisionPolicy: collisionPolicy(job.request),
        includeSubcollections: includeSubcollections(job.request),
        jobId: job.id,
        progress: job.progress,
        resultFilePath: job.result?.filePath ?? null,
        sourceCollectionPath: sourceCollectionPath(job.request),
        sourceConnectionId: sourceConnectionId(job.request),
        targetCollectionPath: targetCollectionPath(job.request),
        targetConnectionId: targetConnectionId(job.request),
        type: job.type,
      },
      status: job.status === 'succeeded'
        ? 'success'
        : job.status === 'cancelled' || job.status === 'interrupted'
        ? 'cancelled'
        : 'failure',
      summary: job.summary ?? job.status,
      target: {
        connectionId: targetConnectionId(job.request) ?? sourceConnectionId(job.request),
        ...(targetPath ? { path: targetPath } : {}),
        type: 'firestore-collection',
      },
    });
  }
}

function jobTitle(request: FirestoreCollectionJobRequest): string {
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

function jobSuccessSummary(job: BackgroundJob): string {
  const progress = job.progress;
  switch (job.type) {
    case 'firestore.deleteCollection':
      return `Deleted ${progress.deleted} document${progress.deleted === 1 ? '' : 's'}.`;
    case 'firestore.exportCollection':
      return `Exported ${progress.read} document${progress.read === 1 ? '' : 's'}.`;
    default:
      return `Wrote ${progress.written} document${progress.written === 1 ? '' : 's'}.`;
  }
}

function sourceConnectionId(request: FirestoreCollectionJobRequest): string {
  if (request.type === 'firestore.copyCollection') return request.sourceConnectionId;
  if (request.type === 'firestore.importCollection') return request.connectionId;
  return request.connectionId;
}

function targetConnectionId(request: FirestoreCollectionJobRequest): string | null {
  if (request.type === 'firestore.copyCollection') return request.targetConnectionId;
  if (request.type === 'firestore.importCollection') return request.connectionId;
  if (request.type === 'firestore.duplicateCollection') return request.connectionId;
  return null;
}

function sourceCollectionPath(request: FirestoreCollectionJobRequest): string | null {
  if (request.type === 'firestore.copyCollection') return request.sourceCollectionPath;
  if (request.type === 'firestore.importCollection') return null;
  if (request.type === 'firestore.duplicateCollection') return request.collectionPath;
  return request.collectionPath;
}

function targetCollectionPath(request: FirestoreCollectionJobRequest): string | null {
  if (request.type === 'firestore.copyCollection') return request.targetCollectionPath;
  if (request.type === 'firestore.duplicateCollection') return request.targetCollectionPath;
  if (request.type === 'firestore.importCollection') return request.targetCollectionPath;
  return null;
}

function includeSubcollections(request: FirestoreCollectionJobRequest): boolean {
  return 'includeSubcollections' in request ? Boolean(request.includeSubcollections) : false;
}

function collisionPolicy(request: FirestoreCollectionJobRequest): string | null {
  return 'collisionPolicy' in request ? request.collisionPolicy : null;
}

function errorInfo(error: unknown): { readonly message: string; readonly name?: string; } {
  if (error instanceof Error) {
    return { message: error.message, ...(error.name ? { name: error.name } : {}) };
  }
  return { message: String(error) };
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
