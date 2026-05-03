import { BackgroundJobSchema } from '@firebase-desk/ipc-schemas/jobs';
import type { BackgroundJob, BackgroundJobListRequest } from '@firebase-desk/repo-contracts/jobs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeJsonAtomic } from './atomic-write.ts';

interface JobsFile {
  readonly jobs: ReadonlyArray<BackgroundJob>;
  readonly version: 1;
}

export class JobsStore {
  private readonly filePath: string;
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(userDataPath: string) {
    this.filePath = join(userDataPath, 'background-jobs.json');
  }

  async add(job: BackgroundJob): Promise<void> {
    await this.runMutation(async () => {
      const jobs = await this.readJobs();
      await this.writeJobs([job, ...jobs]);
    });
  }

  async acknowledgeIssues(ids: ReadonlyArray<string>, acknowledgedAt: string): Promise<
    ReadonlyArray<BackgroundJob>
  > {
    const idSet = new Set(ids);
    const updated: BackgroundJob[] = [];
    await this.runMutation(async () => {
      const jobs = await this.readJobs();
      const next = jobs.map((job) => {
        if (!idSet.has(job.id) || !isIssueStatus(job.status) || job.acknowledgedAt) return job;
        const acknowledged = { ...job, acknowledgedAt, updatedAt: acknowledgedAt };
        updated.push(acknowledged);
        return acknowledged;
      });
      await this.writeJobs(next);
    });
    return updated;
  }

  async clearCompleted(): Promise<ReadonlyArray<string>> {
    let removed: ReadonlyArray<string> = [];
    await this.runMutation(async () => {
      const jobs = await this.readJobs();
      removed = jobs
        .filter((job) => isFinalStatus(job.status))
        .map((job) => job.id);
      await this.writeJobs(jobs.filter((job) => !isFinalStatus(job.status)));
    });
    return removed;
  }

  async interruptActive(now: string): Promise<ReadonlyArray<BackgroundJob>> {
    let interrupted: ReadonlyArray<BackgroundJob> = [];
    await this.runMutation(async () => {
      const jobs = await this.readJobs();
      const next = jobs.map((job) => {
        if (job.status !== 'queued' && job.status !== 'running') return job;
        return {
          ...job,
          finishedAt: now,
          status: 'interrupted' as const,
          summary: 'Job interrupted because Firebase Desk closed.',
          updatedAt: now,
        };
      });
      interrupted = next.filter((job, index) => next[index] !== jobs[index]);
      await this.writeJobs(next);
    });
    return interrupted;
  }

  async list(request: BackgroundJobListRequest = {}): Promise<ReadonlyArray<BackgroundJob>> {
    await this.waitForMutations();
    const jobs = await this.readJobs();
    const filtered = request.status && request.status !== 'all'
      ? jobs.filter((job) => job.status === request.status)
      : jobs;
    return sortByCreatedAt(filtered, 'desc').slice(0, request.limit ?? filtered.length);
  }

  async oldestQueued(): Promise<BackgroundJob | null> {
    await this.waitForMutations();
    const jobs = await this.readJobs();
    return sortByCreatedAt(jobs.filter((job) => job.status === 'queued'), 'asc')[0] ?? null;
  }

  async update(
    id: string,
    update: (job: BackgroundJob) => BackgroundJob,
  ): Promise<BackgroundJob | null> {
    let updated: BackgroundJob | null = null;
    await this.runMutation(async () => {
      const jobs = await this.readJobs();
      const next = jobs.map((job) => {
        if (job.id !== id) return job;
        updated = update(job);
        return updated;
      });
      await this.writeJobs(next);
    });
    return updated;
  }

  private async readJobs(): Promise<ReadonlyArray<BackgroundJob>> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (!isJobsFile(parsed)) return [];
      return parsed.jobs.flatMap((job) => {
        const result = BackgroundJobSchema.safeParse(job);
        return result.success ? [result.data as BackgroundJob] : [];
      });
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
  }

  private async writeJobs(jobs: ReadonlyArray<BackgroundJob>): Promise<void> {
    await writeJsonAtomic(this.filePath, { version: 1, jobs } satisfies JobsFile);
  }

  private runMutation(operation: () => Promise<void>): Promise<void> {
    const next = this.mutationQueue.then(operation, operation);
    this.mutationQueue = next.catch(() => undefined);
    return next;
  }

  private async waitForMutations(): Promise<void> {
    await this.mutationQueue.catch(() => undefined);
  }
}

function isFinalStatus(status: BackgroundJob['status']): boolean {
  return status === 'cancelled'
    || status === 'failed'
    || status === 'interrupted'
    || status === 'succeeded';
}

function isIssueStatus(status: BackgroundJob['status']): boolean {
  return status === 'failed' || status === 'interrupted';
}

function sortByCreatedAt(
  jobs: ReadonlyArray<BackgroundJob>,
  direction: 'asc' | 'desc',
): ReadonlyArray<BackgroundJob> {
  const sorted: BackgroundJob[] = [];
  for (const job of jobs) {
    const index = sorted.findIndex((entry) =>
      direction === 'asc'
        ? job.createdAt.localeCompare(entry.createdAt) < 0
        : job.createdAt.localeCompare(entry.createdAt) > 0
    );
    if (index === -1) sorted.push(job);
    else sorted.splice(index, 0, job);
  }
  return sorted;
}

function isJobsFile(value: unknown): value is JobsFile {
  return typeof value === 'object'
    && value !== null
    && (value as { readonly version?: unknown; }).version === 1
    && Array.isArray((value as { readonly jobs?: unknown; }).jobs);
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}
