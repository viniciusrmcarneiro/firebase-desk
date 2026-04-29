import type {
  ActivityLogAppendInput,
  ActivityLogEntry,
  ActivityLogExportResult,
  ActivityLogListRequest,
  ActivityLogRepository,
} from '@firebase-desk/repo-contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearActivity,
  createActivityOpenTargetIntent,
  exportActivity,
  loadActivity,
  loadLatestActivityIssue,
  recordActivity,
} from './activityCommands.ts';
import { createActivityStore } from './activityStore.ts';
import { activityFiltersChanged, activityOpened } from './activityTransitions.ts';

describe('activity commands', () => {
  let repository: FakeActivityRepository;
  let statuses: string[];

  beforeEach(() => {
    repository = new FakeActivityRepository();
    statuses = [];
  });

  it('loads activity with the current filters', async () => {
    const store = createActivityStore();
    store.update((state) =>
      activityFiltersChanged(activityOpened(state), {
        area: 'firestore',
        search: 'orders',
        status: 'success',
      })
    );
    repository.entries = [makeEntry('1', 'success')];

    await loadActivity(store, env(repository, statuses));

    expect(repository.listRequests).toEqual([
      { area: 'firestore', limit: 200, search: 'orders', status: 'success' },
    ]);
    expect(store.get().entries).toMatchObject([{ id: '1' }]);
    expect(store.get().isLoading).toBe(false);
  });

  it('keeps load failures in state and reports status', async () => {
    const store = createActivityStore();
    repository.listError = new Error('disk failed');

    await loadActivity(store, env(repository, statuses));

    expect(store.get().isLoading).toBe(false);
    expect(store.get().lastErrorMessage).toBe('disk failed');
    expect(statuses).toEqual(['Activity load failed: disk failed']);
  });

  it('loads the latest issue preview without loading drawer entries', async () => {
    const store = createActivityStore();
    repository.entries = [makeEntry('2', 'failure')];

    await loadLatestActivityIssue(store, env(repository, statuses));

    expect(repository.listRequests).toEqual([{ limit: 1 }]);
    expect(store.get().entries).toEqual([]);
    expect(store.get().unreadIssue?.id).toBe('2');
  });

  it('records appended entries through the repository', async () => {
    const store = createActivityStore();
    const input: ActivityLogAppendInput = {
      action: 'Save document',
      area: 'firestore',
      status: 'failure',
      summary: 'Could not save',
    };

    const recorded = await recordActivity(store, env(repository, statuses), input);

    expect(recorded?.id).toBe('activity-1');
    expect(store.get().unreadIssue?.summary).toBe('Could not save');
  });

  it('clears activity and reports success', async () => {
    const store = createActivityStore();
    await recordActivity(store, env(repository, statuses), {
      action: 'Run query',
      area: 'firestore',
      status: 'failure',
      summary: 'Failed',
    });

    await clearActivity(store, env(repository, statuses));

    expect(repository.entries).toEqual([]);
    expect(store.get().unreadIssue).toBeNull();
    expect(statuses).toEqual(['Cleared activity']);
  });

  it('reports clear failures without mutating state', async () => {
    const store = createActivityStore();
    const failure = makeEntry('1', 'failure');
    store.update((state) => ({ ...state, entries: [failure], unreadIssue: failure }));
    repository.clearError = new Error('cannot clear');

    await clearActivity(store, env(repository, statuses));

    expect(store.get().entries).toEqual([failure]);
    expect(statuses).toEqual(['Activity clear failed: cannot clear']);
  });

  it('exports activity with current filters and reports the file path', async () => {
    const store = createActivityStore();
    store.update((state) => activityFiltersChanged(state, { search: 'auth' }));
    repository.exportResult = { canceled: false, filePath: '/tmp/activity.jsonl' };

    await exportActivity(store, env(repository, statuses));

    expect(repository.exportRequests).toEqual([
      { area: 'all', limit: 200, search: 'auth', status: 'all' },
    ]);
    expect(statuses).toEqual(['Exported activity /tmp/activity.jsonl']);
  });

  it('stores export failures and reports status', async () => {
    const store = createActivityStore();
    repository.exportError = new Error('no permission');

    await exportActivity(store, env(repository, statuses));

    expect(store.get().lastErrorMessage).toBe('no permission');
    expect(statuses).toEqual(['Activity export failed: no permission']);
  });

  it('creates open-target intents for supported targets only', () => {
    expect(createActivityOpenTargetIntent({
      ...makeEntry('1', 'success'),
      target: { connectionId: 'emu', path: 'orders/1', type: 'firestore-document' },
    })).toEqual({ connectionId: 'emu', path: 'orders/1', type: 'firestore' });
    expect(createActivityOpenTargetIntent({
      ...makeEntry('2', 'success'),
      target: { connectionId: 'emu', type: 'auth-user', uid: 'u_ada' },
    })).toEqual({ connectionId: 'emu', type: 'auth', uid: 'u_ada' });
    expect(createActivityOpenTargetIntent({
      ...makeEntry('3', 'success'),
      target: { connectionId: 'emu', type: 'settings' },
    })).toBeNull();
  });
});

function env(repository: ActivityLogRepository, statuses: string[]) {
  return {
    onStatus: (message: string) => statuses.push(message),
    repository,
  };
}

function makeEntry(id: string, status: ActivityLogEntry['status']): ActivityLogEntry {
  return {
    action: 'Run query',
    area: 'firestore',
    id,
    status,
    summary: `${status} summary`,
    timestamp: `2026-04-29T00:00:0${id}.000Z`,
  };
}

class FakeActivityRepository implements ActivityLogRepository {
  entries: ActivityLogEntry[] = [];
  appendError: Error | null = null;
  clearError: Error | null = null;
  exportError: Error | null = null;
  exportRequests: ActivityLogListRequest[] = [];
  exportResult: ActivityLogExportResult = { canceled: true };
  listError: Error | null = null;
  listRequests: ActivityLogListRequest[] = [];
  private nextId = 1;

  async append(input: ActivityLogAppendInput): Promise<ActivityLogEntry> {
    if (this.appendError) throw this.appendError;
    const appendedEntry: ActivityLogEntry = {
      ...input,
      id: `activity-${this.nextId++}`,
      timestamp: '2026-04-29T00:00:00.000Z',
    };
    this.entries = [appendedEntry, ...this.entries];
    return appendedEntry;
  }

  async clear(): Promise<void> {
    if (this.clearError) throw this.clearError;
    this.entries = [];
  }

  async export(request?: ActivityLogListRequest): Promise<ActivityLogExportResult> {
    if (this.exportError) throw this.exportError;
    this.exportRequests.push(request ?? {});
    return this.exportResult;
  }

  async list(request?: ActivityLogListRequest): Promise<ReadonlyArray<ActivityLogEntry>> {
    if (this.listError) throw this.listError;
    this.listRequests.push(request ?? {});
    return this.entries;
  }
}
