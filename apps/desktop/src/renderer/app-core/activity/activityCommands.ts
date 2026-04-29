import type {
  ActivityLogAppendInput,
  ActivityLogEntry,
  ActivityLogRepository,
} from '@firebase-desk/repo-contracts';
import { selectActivityListRequest } from './activitySelectors.ts';
import type { ActivityStore } from './activityStore.ts';
import { updateActivityStore } from './activityStore.ts';
import {
  activityCleared,
  activityExportFailed,
  activityIssuePreviewLoaded,
  activityLoadFailed,
  activityLoadStarted,
  activityLoadSucceeded,
  activityRecorded,
} from './activityTransitions.ts';

export interface ActivityCommandEnvironment {
  readonly onStatus?: ((message: string) => void) | undefined;
  readonly repository: ActivityLogRepository;
}

export async function loadActivity(
  store: ActivityStore,
  env: ActivityCommandEnvironment,
): Promise<void> {
  updateActivityStore(store, activityLoadStarted);
  try {
    const entries = await env.repository.list(selectActivityListRequest(store.state));
    updateActivityStore(store, (state) => activityLoadSucceeded(state, entries));
  } catch (error) {
    const message = messageFromError(error, 'Could not load activity.');
    updateActivityStore(store, (state) => activityLoadFailed(state, message));
    env.onStatus?.(`Activity load failed: ${message}`);
  }
}

export async function loadLatestActivityIssue(
  store: ActivityStore,
  env: ActivityCommandEnvironment,
): Promise<void> {
  try {
    const entries = await env.repository.list({ limit: 1 });
    updateActivityStore(store, (state) => activityIssuePreviewLoaded(state, entries));
  } catch {
    // The status bar indicator is best-effort; failing to load it should not block the app.
  }
}

export async function recordActivity(
  store: ActivityStore,
  env: ActivityCommandEnvironment,
  input: ActivityLogAppendInput,
): Promise<ActivityLogEntry | null> {
  try {
    const entry = await env.repository.append(input);
    updateActivityStore(store, (state) => activityRecorded(state, entry));
    return entry;
  } catch {
    // Activity logging is secondary to the user action that created it.
    return null;
  }
}

export async function clearActivity(
  store: ActivityStore,
  env: ActivityCommandEnvironment,
): Promise<void> {
  try {
    await env.repository.clear();
    updateActivityStore(store, activityCleared);
    env.onStatus?.('Cleared activity');
  } catch (error) {
    env.onStatus?.(
      `Activity clear failed: ${messageFromError(error, 'Could not clear activity.')}`,
    );
  }
}

export async function exportActivity(
  store: ActivityStore,
  env: ActivityCommandEnvironment,
): Promise<void> {
  try {
    const result = await env.repository.export(selectActivityListRequest(store.state));
    if (!result.canceled) {
      env.onStatus?.(`Exported activity ${result.filePath ?? ''}`.trim());
    }
  } catch (error) {
    const message = messageFromError(error, 'Could not export activity.');
    updateActivityStore(store, (state) => activityExportFailed(state, message));
    env.onStatus?.(`Activity export failed: ${message}`);
  }
}

export type ActivityOpenTargetIntent =
  | {
    readonly connectionId: string;
    readonly path: string;
    readonly type: 'firestore';
  }
  | {
    readonly connectionId: string;
    readonly type: 'auth';
    readonly uid: string | null;
  };

export function createActivityOpenTargetIntent(
  entry: ActivityLogEntry,
): ActivityOpenTargetIntent | null {
  const target = entry.target;
  if (!target?.connectionId) return null;
  if (target.type === 'firestore-document' || target.type === 'firestore-query') {
    const path = target.path ?? '';
    return path ? { connectionId: target.connectionId, path, type: 'firestore' } : null;
  }
  if (target.type === 'auth-user') {
    return { connectionId: target.connectionId, type: 'auth', uid: target.uid ?? null };
  }
  return null;
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
