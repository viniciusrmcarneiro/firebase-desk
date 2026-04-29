import { Store } from '@tanstack/react-store';
import { type ActivityState, createInitialActivityState } from './activityState.ts';

export type ActivityStore = Store<ActivityState>;

export function createActivityStore(
  initialState: ActivityState = createInitialActivityState(),
): ActivityStore {
  return new Store(initialState);
}

export function updateActivityStore(
  store: ActivityStore,
  transition: (state: ActivityState) => ActivityState,
): void {
  store.setState(transition);
}
