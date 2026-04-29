# App Core Pattern

## Goal

Firebase Desk app behavior should be easy to reason about without rendering React.

New app workflow code should keep business rules in UI-framework-agnostic core modules. React should render state and send user intent. Async commands should do IO explicitly and then apply pure state transitions.

This avoids `AppShell` becoming a mix of layout, workflow orchestration, state synchronization, and inferred `useEffect` behavior.

## Principles

- Preserve visible behavior during refactors.
- Prefer explicit commands over `useEffect` watchers.
- Keep state transitions pure and named.
- Keep IO at the edge.
- Keep React adapters thin.
- Test workflow behavior without React when possible.
- Use AppShell tests as integration safety, not as the main workflow test layer.
- Do not force this pattern into tiny local UI state.

## Architecture

Renderer app logic is split into four layers:

```text
React UI
  -> adapter hooks / event handlers
  -> app-core commands
  -> repositories / IPC / persistence
  -> pure state transitions
  -> subscribed UI renders
```

Target layout:

```text
apps/desktop/src/renderer/
  app/                         # React composition, adapters, layout
  app-core/
    activity/
      activityState.ts
      activityReducer.ts
      activitySelectors.ts
      activityCommands.ts
      activityStore.ts
      *.test.ts
    firestore/
      queryWorkflow.ts
      writeWorkflow.ts
      *.test.ts
    auth/
    js-query/
    workspace/
```

`packages/product-ui` remains reusable Firebase-aware UI. It should not own desktop app orchestration.

## Pattern

### State

Feature state is plain data.

```ts
export interface ActivityState {
  readonly open: boolean;
  readonly entries: ReadonlyArray<ActivityLogEntry>;
  readonly unreadIssue: ActivityLogEntry | null;
  readonly filters: ActivityFilters;
}
```

Use discriminated unions for workflows with meaningful phases.

```ts
export type SaveState =
  | { readonly status: 'idle'; }
  | { readonly status: 'saving'; readonly documentPath: string; }
  | {
    readonly status: 'conflict';
    readonly documentPath: string;
    readonly remote: FirestoreDocumentResult;
  }
  | { readonly status: 'failed'; readonly documentPath: string; readonly error: string; };
```

### Transitions

Transitions are pure functions. Same input, same output. No repositories, timers, DOM, React, storage, or IPC.

```ts
export function activityOpened(state: ActivityState): ActivityState {
  return { ...state, open: true, unreadIssue: null };
}

export function activityRecorded(
  state: ActivityState,
  entry: ActivityLogEntry,
): ActivityState {
  return {
    ...state,
    entries: state.open ? [entry, ...state.entries].slice(0, 200) : state.entries,
    unreadIssue: !state.open && isActivityIssue(entry) ? entry : state.unreadIssue,
  };
}
```

Prefer named transition functions for small features. A reducer/event union is fine when the feature has many transitions, but avoid one global app reducer.

### Commands

Commands are the only place for workflow IO. They call repositories, then apply transitions or dispatch state updates.

```ts
export async function recordActivity(
  env: ActivityCommandEnv,
  input: ActivityLogAppendInput,
): Promise<ActivityCommandResult> {
  const entry = await env.activityRepository.append(input);
  return { entry, transition: (state) => activityRecorded(state, entry) };
}
```

Commands should be callable by UI and non-UI sources.

```ts
await commands.runFirestoreQuery({
  connectionId,
  query,
  source: 'scheduler',
  visible: false,
  notifyOn: 'failure',
});
```

This makes scheduler behavior use the same workflow path as a user click.

### Stores

Use a tiny framework-agnostic store for app-core state.

```ts
export interface Store<T> {
  get(): T;
  set(next: T): void;
  subscribe(listener: () => void): () => void;
}
```

React subscribes through an adapter, usually `useSyncExternalStore`.

```ts
export function useActivityState(store: Store<ActivityState>) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
```

### React Adapters

React adapters map state and commands to component props. They should not contain workflow rules.

```tsx
const activity = useActivityController(activityStore, commands);

<ActivityDrawer {...activity.drawerProps} />
<Button onClick={activity.toggle}>
  Activity
  {activity.unreadIssue ? <Badge>{activity.unreadIssue.status}</Badge> : null}
</Button>
```

### React 19 Hooks

Use React 19 hooks in the adapter/UI layer when they make rendering and user intent clearer.

- `useSyncExternalStore`: subscribe to app-core stores.
- `useActionState`: form/dialog submissions with pending and error UI.
- `useOptimistic`: local optimistic rendering while a command is in flight.
- `useTransition`: defer non-urgent UI updates such as heavy tab switches or local filtering.
- `useEffectEvent`: stable event callbacks from effects without stale closures or dependency churn.
- `use`: only for intentionally Suspense-backed async resources. Prefer explicit loading/error states for admin workflows unless Suspense makes the user experience clearer.
- ref cleanup callbacks and `ref` as a prop: use when they simplify component APIs.

React 19 hooks are adapter tools. Do not use them to hide domain transitions inside component effects. If a rule affects workflow behavior, put it in app-core and call it from React.

### Preserved React UI State

React-hidden or preserved component state can be useful for view-local state. Use it when preserving the mounted UI improves ergonomics or performance without changing app workflow semantics.

Good fits:

- inactive workspace tab panels
- Monaco editor instances and local editor state
- Firestore result table/tree scroll positions
- expanded JSON/tree nodes
- side panel and drawer local UI state
- Auth detail panel view state
- JS Query output tab state

Do not use preserved React state for app workflows. If state affects repository calls, Activity, scheduler behavior, persistence, conflict handling, status indicators, or cross-component coordination, it belongs in app-core.

Rule of thumb:

- React preservation: visual or interaction-local state.
- App-core: workflow and product behavior state.

## Testing Strategy

### Core Tests

Pure transitions and selectors get direct unit tests.

```ts
expect(activityOpened(stateWithUnreadIssue).unreadIssue).toBeNull();
expect(activityRecorded(closedState, failure).unreadIssue).toBe(failure);
expect(activityRecorded(closedStateWithIssue, success).unreadIssue).toBe(existingIssue);
```

Command tests mock repositories and assert emitted transitions, repository calls, and activity records.

### React Tests

React tests should not walk long workflows just to reach state. Prefer rendering with explicit state and checking:

- the expected UI renders for that state
- user intent calls the expected command
- important integration wiring still works

Keep a small number of AppShell integration tests as regression coverage.

### E2E Tests

E2E keeps covering real app workflows against emulators. It verifies app wiring, not every state transition.

## When To Use This Pattern

Use app-core for:

- Activity trail and unread issue state
- Firestore query, pagination, refresh, stale results
- Firestore create, save, field patch, conflict, delete flows
- Auth search, selection, custom claims save
- JavaScript Query run, cancel, output, failure states
- workspace tabs, selection, persisted workspace state
- settings workflows that affect app behavior
- scheduler-triggered workflows

Keep local React state for:

- input focus
- popover/menu open state owned by a primitive
- hover state
- simple draft text inside isolated forms
- visual-only toggles that do not affect app workflows

## Scheduler Compatibility

Schedulers should call the same commands as the UI. They should not duplicate repository or activity logic.

Every scheduled command must define:

- source: `user` or `scheduler`
- visibility: whether it opens/updates visible tabs
- notification policy
- cancellation policy
- serialization policy per project/tab/workflow

Activity logging should happen in the command path so background and user actions are recorded consistently.

## Migration Plan

Track implementation in [app-core-refactor-tasks.md](app-core-refactor-tasks.md).

1. Extract Activity first.
   - Move drawer state, filters, loading, entries, unread issue, clear/export/load, and record behavior into `app-core/activity`.
   - Keep existing AppShell tests passing.
   - Add pure tests for all activity transitions.

2. Extract Firestore query lifecycle.
   - Move run, load more, refresh, stale result, and query activity behavior.
   - Avoid `useEffect` watchers for query completion when command completion can record explicitly.

3. Extract Firestore write workflows.
   - Model create/save/field-patch/delete/conflict as explicit states.
   - Keep full-document and field-patch behavior testable without rendering modals.

4. Extract Auth and JS Query workflows.
   - Share command shape with future schedulers.

5. Clean AppShell.
   - AppShell should compose layout, controllers, and feature surfaces.
   - It should not infer domain events by watching unrelated state combinations.

## Review Checklist

- Is the behavior represented by explicit state?
- Are transitions pure?
- Is IO limited to commands/repositories?
- Can the workflow be unit-tested without React?
- Can the same command be called by UI and a scheduler?
- Did existing AppShell/component tests keep passing?
- Did we avoid moving simple local visual state into app-core?
