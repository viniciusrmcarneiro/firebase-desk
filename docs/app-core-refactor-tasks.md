# App Core Refactor Tasks

## Goal

Move desktop renderer workflow logic out of `AppShell` and React effects into UI-framework-agnostic app-core modules.

The refactor must preserve current behavior while making workflows easier to reason about, easier to unit test, and usable from non-UI sources such as schedulers.

Reference: [app-core-pattern.md](app-core-pattern.md).

## Rules

- Preserve user-visible behavior unless a task explicitly changes it.
- Keep existing AppShell tests passing during extraction.
- Add app-core tests before or with each extraction.
- Prefer pure transition tests over React interaction tests.
- Keep React 19 hooks in the adapter/component layer.
- Do not move simple local visual state into app-core.
- Do not introduce a single global reducer.
- Do not rewrite the whole app in one PR.

## Target Shape

```text
apps/desktop/src/renderer/
  app/                         # React composition, adapters, layout
  app-core/
    activity/
    firestore/
    auth/
    js-query/
    workspace/
    settings/
```

`AppShell` should eventually compose controllers and layout. It should not own domain workflows or infer completion from unrelated `useEffect` state watchers.

## Current AppShell Responsibility Inventory

Use this inventory to decide extraction boundaries and to avoid adding more workflow code to `AppShell` while the refactor is in progress.

- Activity: drawer state, filters, loading, unread failure/conflict indicator, Activity persistence commands, target opening, and Activity records emitted by Firestore/Auth/JS/settings/workspace flows.
- Firestore query: active draft wiring, query execution, pagination, refresh, query result selection, stale result banners, subcollection loading, and query completion Activity records.
- Firestore writes: create document, full-document JSON save, field patch writes, conflict handling, delete document confirmation/subcollection options, query invalidation, and write Activity records.
- Auth: list/search/pagination wiring, selected user, custom claims save, refresh/load-more actions, and failure/save Activity records.
- JavaScript Query: script source wiring, run/cancel commands, result state, output counts, and completion Activity records.
- Workspace/tabs/selection: tab lifecycle, history, tree selection, Auth user selection, Firestore document selection, persisted workspace restore/save, busy-tab close guards, and global command palette items.
- Settings/appearance: settings dialog lifecycle, density, sidebar width, data directory display, data mode/Activity/write preference updates, and settings Activity records.

Initial app-core folder naming:

- Use `apps/desktop/src/renderer/app-core/<area>/`.
- Export public feature APIs from each area `index.ts`.
- Keep pure state/transitions/selectors in `*.ts` files, commands in `*Commands.ts`, adapters in `use*Controller.ts`, and tests next to the owning module.
- Shared app-core utilities live in `apps/desktop/src/renderer/app-core/shared/`.

## Phase 0: Guardrails

- [x] Add this task doc and keep it linked from architecture docs.
- [x] Identify current AppShell responsibilities by area: activity, Firestore, Auth, JS Query, workspace, settings.
- [x] Mark current AppShell tests as regression coverage. Do not delete them before core coverage exists.
- [x] Add a short developer note in `AGENTS.md` that new renderer workflows must follow the app-core pattern.
- [x] Avoid new AppShell workflow effects while the refactor is in progress.
- [x] Decide initial app-core folder naming and export conventions.

## Phase 1: Activity Core

Activity is the first extraction because it is self-contained and already exposed brittle behavior.

- [x] Create `apps/desktop/src/renderer/app-core/activity/`.
- [x] Add `ActivityState`, `ActivityFilters`, and initial-state helper.
- [x] Add pure transitions:
  - [x] `activityOpened`
  - [x] `activityClosed`
  - [x] `activityExpandedChanged`
  - [x] `activityFiltersChanged`
  - [x] `activityLoadStarted`
  - [x] `activityLoadSucceeded`
  - [x] `activityLoadFailed`
  - [x] `activityRecorded`
  - [x] `activityCleared`
  - [x] `activityExportFailed`
- [x] Add selectors:
  - [x] drawer props model
  - [x] unread issue
  - [x] filtered list request
  - [x] button variant/status model
- [x] Add commands:
  - [x] load activity
  - [x] record activity
  - [x] clear activity
  - [x] export activity
  - [x] open activity target intent
- [x] Add a tiny store or reuse a shared app-core store helper.
- [x] Add React adapter hook for Activity.
- [x] Move Activity state and handlers out of `AppShell`.
- [x] Keep Activity drawer UI in `packages/product-ui`.
- [x] Keep current status-bar behavior:
  - [x] failure/conflict shows unread issue badge
  - [x] newer success does not clear unread issue
  - [x] opening Activity clears unread issue
  - [x] issue recorded while Activity is open does not create unread badge
- [x] Add pure tests for all Activity transitions and selectors.
- [x] Add command tests with mocked `ActivityLogRepository`.
- [x] Keep or simplify AppShell tests to verify wiring only.

## Phase 2: Shared App-Core Store And React Adapter

- [x] Add a generic store helper:
  - [x] `get`
  - [x] `set`
  - [x] `update`
  - [x] `subscribe`
  - [x] batch/transaction support only if needed
- [x] Add React `useSyncExternalStore` adapter helper.
- [x] Add a command environment type for repositories, query client hooks, clock, and ID generation.
- [x] Add test helpers for rendering AppShell with explicit app-core state.
- [x] Document when to use `useActionState`, `useOptimistic`, `useTransition`, `useEffectEvent`, and `use`.
- [x] Remove duplicated store/subscription code from feature controllers.

## Phase 3: Firestore Query Core

Extract query lifecycle before write lifecycle.

- [x] Create `app-core/firestore/query`.
- [x] Model query state:
  - [x] draft
  - [x] active query
  - [x] loading/fetching-more
  - [x] pages and loaded page count
  - [x] has more
  - [x] selected document path
  - [x] results stale
  - [x] error
- [x] Add pure transitions:
  - [x] draft changed
  - [x] query started
  - [x] query succeeded
  - [x] query failed
  - [x] load more started/succeeded/failed
  - [x] refresh started/succeeded/failed
  - [x] result view changed
  - [x] document selected
  - [x] subcollections loaded
  - [x] results marked stale
  - [x] results refreshed
- [x] Add selectors:
  - [x] collection vs document query
  - [x] result rows
  - [x] selected document
  - [x] loaded page count
  - [x] query metadata for Activity
- [x] Add commands:
  - [x] run query
  - [x] load more
  - [x] refresh preserving loaded page count
  - [x] load subcollections
  - [x] open document in new tab intent
- [x] Move query completion Activity logging into command results.
- [x] Remove AppShell effects that infer Firestore query completion from `activeQueryRunId`/loading state.
- [x] Add pure tests for pagination, refresh, stale results, selection, and errors.
- [x] Keep e2e smoke coverage unchanged.

## Phase 4: Firestore Write Core

Move write flows after query extraction.

- [x] Create `app-core/firestore/write`.
- [x] Model create document state:
  - [x] idle
  - [x] generating ID
  - [x] editing
  - [x] creating
  - [x] failed
- [x] Model full document save state:
  - [x] idle
  - [x] editing
  - [x] saving
  - [x] conflict
  - [x] failed
- [x] Model field patch state:
  - [x] idle
  - [x] editing
  - [x] saving
  - [x] stale document changed
  - [x] field conflict
  - [x] failed
- [x] Model delete document state:
  - [x] idle
  - [x] confirming
  - [x] deleting
  - [x] failed
- [x] Add pure transitions for each write state.
- [x] Add selectors for modal props and command availability.
- [x] Add commands:
  - [x] generate document ID
  - [x] create document
  - [x] save full document
  - [x] save merged conflict
  - [x] update field patch
  - [x] delete field
  - [x] delete document with selected subcollections
- [x] Keep field patch writes patch-only; do not fall back to full document saves.
- [x] Keep conflict behavior explicit and unit-tested.
- [x] Move write Activity logging into write commands.
- [x] Remove write handlers from AppShell except adapter wiring.
- [x] Add pure tests for conflict, stale field behavior, set null, delete field, full save, create, and delete.
- [x] Keep smoke tests for emulator create/edit/conflict/delete.

## Phase 5: Auth Core

- [x] Create `app-core/auth`.
- [x] Model users list/search state:
  - [x] filter
  - [x] loading
  - [x] loading more
  - [x] selected user
  - [x] error
  - [x] has more
- [x] Model custom claims edit state.
- [x] Add commands:
  - [x] load users
  - [x] search users
  - [x] load more users
  - [x] select user
  - [x] save custom claims
  - [x] refresh users
- [x] Move Auth failure Activity logging into commands.
- [x] Remove AppShell effect that records Auth failures by watching `authTab.errorMessage`.
- [x] Add pure tests for filter/search, selection, paging, claims save, and failure states.

## Phase 6: JavaScript Query Core

- [x] Create `app-core/js-query`.
- [x] Model script state:
  - [x] source
  - [x] running
  - [x] cancelling
  - [x] result
  - [x] errors/logs/output counts
- [x] Add commands:
  - [x] run script
  - [x] cancel script
  - [x] update source
  - [x] clear result
- [x] Move script Activity logging into commands.
- [x] Remove AppShell effect that records script completion by watching `scriptRunId`/result.
- [x] Add pure tests for run success, failure, cancel, output counts, and activity metadata.

## Phase 7: Workspace, Tabs, And Selection

- [x] Create `app-core/workspace`.
- [x] Move tab operations behind pure transitions:
  - [x] open
  - [x] focus
  - [x] close
  - [x] close others
  - [x] close left/right
  - [x] close all
  - [x] reorder
  - [x] sort by account
  - [x] back/forward history
- [x] Move selection state transitions into app-core:
  - [x] tree selection
  - [x] auth user selection
  - [x] Firestore document selection
- [x] Keep persistence explicit:
  - [x] serialize workspace state
  - [x] restore workspace state
  - [x] do not persist loaded query result data
- [x] Add tests for tab and selection transitions without React.
- [x] Reduce AppShell tab/selection plumbing to adapter calls.

## Phase 8: Settings And Appearance

- [x] Create `app-core/settings` if settings workflows keep growing.
- [x] Keep durable preference storage in `SettingsRepository`.
- [x] Use React 19 `useActionState` for settings form submission where useful.
- [x] Keep appearance mode changes explicit and activity-logged.
- [x] Add tests for data mode, activity settings, Firestore write settings, and theme changes.
- [x] Remove settings-specific command logic from AppShell.

## Phase 9: Scheduler Readiness

Schedulers should call the same commands as UI actions.

- [x] Define `CommandSource = 'user' | 'scheduler'`.
- [x] Add command options:
  - [x] source
  - [x] visible
  - [x] notify policy
  - [x] cancellation policy
  - [x] serialization key
- [x] Ensure Firestore query commands can run without opening a visible tab.
- [x] Ensure mutation commands can choose whether to notify only on failure/conflict.
- [x] Ensure Activity logging is shared between UI and scheduler commands.
- [x] Add command tests for scheduler source.
- [x] Do not add scheduler-specific duplicate repository code.

## Phase 10: Cleanup

- [x] Remove AppShell workflow `useEffect` watchers replaced by commands.
- [x] Remove AppShell callback chains that belong to feature controllers.
- [x] Reduce AppShell to:
  - [x] layout composition
  - [x] top-level repository/provider wiring
  - [x] controller creation
  - [x] cross-feature routing only
- [x] Review redundant React tests after equivalent core tests and one integration test exist.
- [x] Review duplicated mock setup helpers.
- [x] Remove unused AppShell state and refs.
- [x] Remove stale comments left from transitional code.
- [x] Check non-adapter app-core modules have no React imports.
- [x] Check app-core commands do not import product UI.
- [x] Check `packages/product-ui` remains reusable and does not import desktop app-core.
- [x] Update docs after each phase if the architecture changes.

## Verification Gates

Each phase should run:

- [x] `pnpm format:check`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`

Phases touching Firestore/Auth/JS Query workflows should also run:

- [x] `pnpm build`
- [x] `pnpm --dir e2e test:withEmulators`

Manual app verification when practical:

- [x] launch the dev app
- [x] exercise the changed workflow in the real app
- [x] verify Activity entries and status bar behavior
- [x] verify no console/runtime errors

## Done Criteria

- [x] AppShell has no domain workflow effects.
- [x] Core workflow behavior is testable without React.
- [x] AppShell tests mostly render explicit states and verify wiring.
- [x] Scheduler-compatible commands exist for major workflows.
- [x] Existing emulator smoke tests still pass.
- [x] Docs and AGENTS reflect the pattern.
