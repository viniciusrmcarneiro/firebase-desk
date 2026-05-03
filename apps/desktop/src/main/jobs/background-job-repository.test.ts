import type { ActivityLogRepository } from '@firebase-desk/repo-contracts';
import type {
  BackgroundJob,
  BackgroundJobProgress,
  FirestoreCollectionJobRequest,
} from '@firebase-desk/repo-contracts/jobs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobsStore } from '../storage/jobs-store.ts';
import { MainBackgroundJobRepository } from './background-job-repository.ts';
import type {
  FirestoreCollectionJobRunner,
  JobCancellationSignal,
  JobProgressSink,
} from './firestore-collection-job-runner.ts';

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
  },
}));

const tempDirs: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe('MainBackgroundJobRepository', () => {
  it('runs queued jobs one at a time and records final activity once', async () => {
    const runner = new ControlledRunner();
    const activity = activityLog();
    const repo = await makeRepository(runner, activity);

    const first = await repo.start(deleteRequest('orders'));
    const second = await repo.start(deleteRequest('orders_archive'));

    await eventually(() => expect(runner.started).toEqual([first.id]));
    await runner.finish(first.id);
    await eventually(() => expect(runner.started).toEqual([first.id, second.id]));
    await runner.finish(second.id);

    await eventually(() => expect(activity.append).toHaveBeenCalledTimes(2));
    await expect(repo.list()).resolves.toMatchObject([
      { id: second.id, status: 'succeeded' },
      { id: first.id, status: 'succeeded' },
    ]);
  });

  it('cancels queued jobs without starting them', async () => {
    const runner = new ControlledRunner();
    const activity = activityLog();
    const repo = await makeRepository(runner, activity);

    const running = await repo.start(deleteRequest('orders'));
    const queued = await repo.start(deleteRequest('orders_archive'));

    await eventually(() => expect(runner.started).toEqual([running.id]));
    await repo.cancel(queued.id);

    await expect(repo.list()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: queued.id, status: 'cancelled' }),
      ]),
    );
    expect(runner.started).toEqual([running.id]);
    expect(activity.append).toHaveBeenCalledWith(expect.objectContaining({
      status: 'cancelled',
      target: expect.objectContaining({ path: 'orders_archive', type: 'firestore-collection' }),
    }));
    await runner.finish(running.id);
    await eventually(async () => {
      const rows = await repo.list();
      expect(rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: running.id, status: 'succeeded' }),
      ]));
    });
  });

  it('marks durable queued and running jobs as interrupted on startup', async () => {
    const dir = await makeTempDir();
    const store = new JobsStore(dir);
    await store.add(storedJob('queued', 'queued'));
    await store.add(storedJob('running', 'running'));
    const activity = activityLog();
    const repo = new MainBackgroundJobRepository(
      store,
      new ControlledRunner() as unknown as FirestoreCollectionJobRunner,
      activity,
      () => '2026-04-29T00:01:00.000Z',
      () => 'job-new',
    );

    await repo.initialize();

    await expect(repo.list()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'queued', status: 'interrupted' }),
        expect.objectContaining({ id: 'running', status: 'interrupted' }),
      ]),
    );
    expect(activity.append).toHaveBeenCalledTimes(2);
  });

  it('uses configured file picker paths for smoke tests', async () => {
    vi.stubEnv('FIREBASE_DESK_JOB_EXPORT_PATH', '/tmp/export.jsonl');
    vi.stubEnv('FIREBASE_DESK_JOB_IMPORT_PATH', '/tmp/import.jsonl');
    const repo = await makeRepository(new ControlledRunner(), activityLog());

    await expect(repo.pickExportFile('jsonl')).resolves.toEqual({
      canceled: false,
      filePath: '/tmp/export.jsonl',
    });
    await expect(repo.pickImportFile()).resolves.toEqual({
      canceled: false,
      filePath: '/tmp/import.jsonl',
    });
  });
});

class ControlledRunner {
  readonly started: string[] = [];
  private readonly pending = new Map<string, () => void>();

  async run(
    job: BackgroundJob,
    signal: JobCancellationSignal,
    sink: JobProgressSink,
  ) {
    this.started.push(job.id);
    await sink.update({ deleted: 0, failed: 0, read: 1, skipped: 0, written: 0 });
    await new Promise<void>((resolve) => this.pending.set(job.id, resolve));
    if (signal.isCancelled()) return undefined;
    return undefined;
  }

  async finish(id: string): Promise<void> {
    await eventually(() => expect(this.pending.has(id)).toBe(true));
    this.pending.get(id)?.();
    this.pending.delete(id);
    await eventually(() => expect(this.pending.has(id)).toBe(false));
  }
}

async function makeRepository(
  runner: ControlledRunner,
  activity: ActivityLogRepository,
): Promise<MainBackgroundJobRepository> {
  return new MainBackgroundJobRepository(
    new JobsStore(await makeTempDir()),
    runner as unknown as FirestoreCollectionJobRunner,
    activity,
    clock(),
    ids(),
  );
}

function activityLog(): ActivityLogRepository {
  return {
    append: vi.fn(),
    clear: vi.fn(),
    export: vi.fn(),
    list: vi.fn(),
  };
}

function deleteRequest(collectionPath: string): FirestoreCollectionJobRequest {
  return {
    collectionPath,
    connectionId: 'emu',
    includeSubcollections: false,
    type: 'firestore.deleteCollection',
  };
}

function storedJob(id: string, status: BackgroundJob['status']): BackgroundJob {
  return {
    createdAt: `2026-04-29T00:00:0${id === 'queued' ? '1' : '2'}.000Z`,
    id,
    progress: emptyProgress(),
    request: deleteRequest(id),
    status,
    title: 'Delete collection',
    type: 'firestore.deleteCollection',
    updatedAt: '2026-04-29T00:00:00.000Z',
  };
}

function emptyProgress(): BackgroundJobProgress {
  return { deleted: 0, failed: 0, read: 0, skipped: 0, written: 0 };
}

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'firebase-desk-jobs-'));
  tempDirs.push(dir);
  return dir;
}

function ids() {
  let next = 1;
  return () => `job-${next++}`;
}

function clock() {
  let next = 0;
  return () => `2026-04-29T00:00:${String(next++).padStart(2, '0')}.000Z`;
}

async function eventually(assertion: () => void | Promise<void>): Promise<void> {
  const startedAt = Date.now();
  while (true) {
    try {
      // eslint-disable-next-line no-await-in-loop -- Polling retries are intentionally sequential.
      await assertion();
      return;
    } catch (error) {
      if (Date.now() - startedAt > 1_000) throw error;
      // eslint-disable-next-line no-await-in-loop -- Polling retries are intentionally sequential.
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}
