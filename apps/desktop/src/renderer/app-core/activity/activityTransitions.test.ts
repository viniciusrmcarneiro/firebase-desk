import type { ActivityLogEntry } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import {
  selectActivityButtonModel,
  selectActivityDrawerModel,
  selectActivityListRequest,
} from './activitySelectors.ts';
import { createInitialActivityState } from './activityState.ts';
import {
  activityCleared,
  activityClosed,
  activityExpandedChanged,
  activityFiltersChanged,
  activityIssuePreviewLoaded,
  activityLoadFailed,
  activityLoadStarted,
  activityLoadSucceeded,
  activityOpened,
  activityRecorded,
} from './activityTransitions.ts';

describe('activity transitions and selectors', () => {
  it('opens the drawer and clears the unread issue', () => {
    const unreadIssue = entry('1', 'failure');
    const state = activityOpened(createInitialActivityState({ unreadIssue }));

    expect(state.open).toBe(true);
    expect(state.unreadIssue).toBeNull();
  });

  it('closes and expands the drawer without changing entries', () => {
    const entries = [entry('1', 'success')];
    const state = activityClosed(
      activityExpandedChanged(createInitialActivityState({ entries }), true),
    );

    expect(state.open).toBe(false);
    expect(state.expanded).toBe(true);
    expect(state.entries).toBe(entries);
  });

  it('changes filters and exposes the list request', () => {
    const state = activityFiltersChanged(createInitialActivityState(), {
      area: 'firestore',
      search: '  orders  ',
      status: 'failure',
    });

    expect(selectActivityListRequest(state)).toEqual({
      area: 'firestore',
      limit: 200,
      search: 'orders',
      status: 'failure',
    });
  });

  it('tracks loading success and failure states', () => {
    const started = activityLoadStarted(createInitialActivityState());
    expect(started.isLoading).toBe(true);
    expect(started.lastErrorMessage).toBeNull();

    const loaded = activityLoadSucceeded(started, [entry('1', 'success')]);
    expect(loaded.isLoading).toBe(false);
    expect(loaded.entries).toHaveLength(1);

    const failed = activityLoadFailed(started, 'load failed');
    expect(failed.isLoading).toBe(false);
    expect(failed.lastErrorMessage).toBe('load failed');
  });

  it('uses the latest entry preview only when it is an issue', () => {
    const success = activityIssuePreviewLoaded(createInitialActivityState(), [
      entry('1', 'success'),
    ]);
    expect(success.unreadIssue).toBeNull();

    const failure = activityIssuePreviewLoaded(createInitialActivityState(), [
      entry('2', 'failure'),
    ]);
    expect(failure.unreadIssue?.id).toBe('2');
  });

  it('records closed failures as unread without letting later success clear them', () => {
    const failure = entry('1', 'failure');
    const success = entry('2', 'success');

    const state = activityRecorded(
      activityRecorded(createInitialActivityState(), failure),
      success,
    );

    expect(state.unreadIssue).toBe(failure);
    expect(state.entries).toEqual([]);
  });

  it('does not create unread issues while open and prepends matching entries', () => {
    const state = activityFiltersChanged(activityOpened(createInitialActivityState()), {
      area: 'firestore',
    });
    const recorded = activityRecorded(state, entry('1', 'failure'));

    expect(recorded.unreadIssue).toBeNull();
    expect(recorded.entries).toMatchObject([{ id: '1' }]);
  });

  it('does not prepend open entries that do not match filters', () => {
    const state = activityFiltersChanged(activityOpened(createInitialActivityState()), {
      area: 'auth',
    });

    expect(activityRecorded(state, entry('1', 'failure')).entries).toEqual([]);
  });

  it('clears entries and issue state', () => {
    const state = activityCleared(
      createInitialActivityState({
        entries: [entry('1', 'failure')],
        lastErrorMessage: 'failed',
        unreadIssue: entry('1', 'failure'),
      }),
    );

    expect(state.entries).toEqual([]);
    expect(state.lastErrorMessage).toBeNull();
    expect(state.unreadIssue).toBeNull();
  });

  it('builds drawer and status button models', () => {
    const failure = entry('1', 'failure');
    const state = createInitialActivityState({
      entries: [failure],
      expanded: true,
      open: true,
      unreadIssue: failure,
    });

    expect(selectActivityDrawerModel(state)).toMatchObject({
      entries: [failure],
      expanded: true,
      open: true,
    });
    expect(selectActivityButtonModel(state)).toEqual({
      badge: { label: 'failure', variant: 'danger' },
      variant: 'danger',
    });
  });
});

function entry(id: string, status: ActivityLogEntry['status']): ActivityLogEntry {
  return {
    action: 'Run query',
    area: 'firestore',
    id,
    status,
    summary: `${status} summary`,
    timestamp: `2026-04-29T00:00:0${id}.000Z`,
  };
}
