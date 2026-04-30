import { type AppCoreStore, createAppCoreStore } from '../shared/store.ts';
import { type ActivityState, createInitialActivityState } from './activityState.ts';

export type ActivityStore = AppCoreStore<ActivityState>;

export function createActivityStore(
  initialState: ActivityState = createInitialActivityState(),
): ActivityStore {
  return createAppCoreStore(initialState);
}

export function updateActivityStore(
  store: ActivityStore,
  transition: (state: ActivityState) => ActivityState,
): void {
  store.update(transition);
}
