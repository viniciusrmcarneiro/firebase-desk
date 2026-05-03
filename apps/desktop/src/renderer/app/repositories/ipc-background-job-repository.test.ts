import type { BackgroundJobEvent } from '@firebase-desk/repo-contracts/jobs';
import { describe, expect, it, vi } from 'vitest';
import { IpcBackgroundJobRepository } from './ipc-background-job-repository.ts';

describe('IpcBackgroundJobRepository', () => {
  it('forwards job calls to the desktop API', async () => {
    const unsubscribe = vi.fn();
    const jobs = {
      acknowledgeIssues: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue(undefined),
      clearCompleted: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      pickExportFile: vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/orders.jsonl' }),
      pickImportFile: vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/import.jsonl' }),
      start: vi.fn().mockResolvedValue({
        createdAt: '2026-04-29T00:00:00.000Z',
        id: 'job-1',
        progress: { deleted: 0, failed: 0, read: 0, skipped: 0, written: 0 },
        request: deleteRequest,
        status: 'queued',
        title: 'Delete collection',
        type: 'firestore.deleteCollection',
        updatedAt: '2026-04-29T00:00:00.000Z',
      }),
      subscribe: vi.fn(() => unsubscribe),
    } satisfies Partial<DesktopJobsApi>;
    Object.defineProperty(window, 'firebaseDesk', {
      configurable: true,
      value: { jobs },
    });
    const repository = new IpcBackgroundJobRepository();
    const listener = vi.fn();

    await expect(repository.list({ limit: 10 })).resolves.toEqual([]);
    await expect(repository.acknowledgeIssues(['job-1'])).resolves.toBeUndefined();
    await expect(repository.start(deleteRequest)).resolves.toMatchObject({ id: 'job-1' });
    await expect(repository.cancel('job-1')).resolves.toBeUndefined();
    await expect(repository.clearCompleted()).resolves.toBeUndefined();
    await expect(repository.pickExportFile('jsonl')).resolves.toEqual({
      canceled: false,
      filePath: '/tmp/orders.jsonl',
    });
    await expect(repository.pickImportFile()).resolves.toEqual({
      canceled: false,
      filePath: '/tmp/import.jsonl',
    });
    expect(repository.subscribe(listener)).toBe(unsubscribe);

    expect(jobs.list).toHaveBeenCalledWith({ limit: 10 });
    expect(jobs.acknowledgeIssues).toHaveBeenCalledWith({ ids: ['job-1'] });
    expect(jobs.start).toHaveBeenCalledWith(deleteRequest);
    expect(jobs.cancel).toHaveBeenCalledWith({ id: 'job-1' });
    expect(jobs.pickExportFile).toHaveBeenCalledWith({ format: 'jsonl' });
    expect(jobs.subscribe).toHaveBeenCalledWith(listener as (event: BackgroundJobEvent) => void);
  });
});

const deleteRequest = {
  collectionPath: 'orders',
  connectionId: 'emu',
  includeSubcollections: false,
  type: 'firestore.deleteCollection',
} as const;
