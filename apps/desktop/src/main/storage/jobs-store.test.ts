import type { BackgroundJob } from '@firebase-desk/repo-contracts/jobs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobsStore } from './jobs-store.ts';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe('JobsStore', () => {
  it('adds, lists newest first, and finds oldest queued', async () => {
    const store = new JobsStore(await makeTempDir());
    await store.add(job('newer', '2026-04-29T00:00:02.000Z', 'queued'));
    await store.add(job('older', '2026-04-29T00:00:01.000Z', 'queued'));

    await expect(store.list()).resolves.toMatchObject([{ id: 'newer' }, { id: 'older' }]);
    await expect(store.oldestQueued()).resolves.toMatchObject({ id: 'older' });
  });

  it('updates jobs, interrupts active jobs, and clears completed', async () => {
    const store = new JobsStore(await makeTempDir());
    await store.add(job('running', '2026-04-29T00:00:00.000Z', 'running'));
    await store.add(job('done', '2026-04-29T00:00:01.000Z', 'succeeded'));

    const interrupted = await store.interruptActive('2026-04-29T00:01:00.000Z');
    expect(interrupted).toMatchObject([{ id: 'running', status: 'interrupted' }]);

    const updated = await store.update('running', (entry) => ({ ...entry, summary: 'checked' }));
    expect(updated).toMatchObject({ summary: 'checked' });

    const removed = await store.clearCompleted();
    expect(removed).toEqual(['done', 'running']);
    await expect(store.list()).resolves.toEqual([]);
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'firebase-desk-jobs-'));
  tempDirs.push(dir);
  return dir;
}

function job(id: string, createdAt: string, status: BackgroundJob['status']): BackgroundJob {
  return {
    createdAt,
    id,
    progress: { deleted: 0, failed: 0, read: 0, skipped: 0, written: 0 },
    request: {
      collectionPath: 'orders',
      connectionId: 'emu',
      includeSubcollections: false,
      type: 'firestore.deleteCollection',
    },
    status,
    title: 'Delete collection',
    type: 'firestore.deleteCollection',
    updatedAt: createdAt,
  };
}
