# MVP Tasks

Detailed feature tasks and per-page/per-tab specs should be finalized after the live wireframe is reviewed.

## Phase 0: Planning

- [x] Capture product scope.
- [x] Capture live wireframe requirements.
- [x] Capture architecture direction.
- [x] Capture project structure direction.
- [x] Capture repository layer requirement.
- [x] Capture emulator and e2e requirements.
- [x] Capture CI-first requirement.
- [ ] Decide final app name.

## Phase 1: Engineering Foundation

- [ ] Initialize pnpm workspace (`pnpm-workspace.yaml`, root `package.json`).
- [ ] Add Turborepo (`turbo.json`) with `lint`, `typecheck`, `test`, `build`, `dev` pipelines.
- [ ] Add `tsconfig.base.json` and shared config packages (`config-eslint`, `config-tsconfig`, `config-vitest`).
- [ ] Scaffold `packages/repo-contracts` with repository interfaces for projects, Firestore, JS Query, Auth, and settings.
- [ ] Scaffold `packages/repo-mocks` with mock implementations.
- [ ] Scaffold `packages/data-format`, `packages/ipc-schemas`, `packages/ui`, `packages/hotkeys` skeletons.
- [ ] Move `wireframes/` to `apps/wireframe/` as a workspace member; wire it to consume `repo-mocks`.
- [ ] Scaffold `apps/desktop` (Electron + React + TypeScript via electron-vite).
- [ ] Wire `@tanstack/react-virtual` into `packages/ui` list/table/tree primitives before any data-heavy view ships (workspace tree, query result table, query result tree, JSON viewer, Auth users table, JS Query streamed output).
- [ ] Wire `@tanstack/react-hotkeys` inside `packages/hotkeys` and ship the central registry with the wireframe defaults; expose an override map via `SettingsRepository` (rebinding UI ships later).
- [ ] Persist `--sidebar-width` (global) and `--inspector-width` (per query tab) via `SettingsRepository`/tab state.
- [ ] Configure colocated unit test runner per package (vitest extending `config-vitest`).
- [ ] Add first colocated unit test in at least `repo-mocks` and `data-format`.
- [ ] Add Firebase Emulator Suite config (`firebase/emulator/`) for Firestore and Auth.
- [ ] Add emulator seed fixture plan.
- [ ] Scaffold `e2e/` workspace with Playwright/Electron setup.
- [ ] Add first emulator-backed e2e smoke test.
- [ ] Add GitHub Actions `ci.yml` (turbo-cached lint/typecheck/test/build).
- [ ] Add GitHub Actions `e2e.yml`.
- [ ] Add GitHub Actions `release.yml`.
- [ ] Verify workflows run locally through equivalent pnpm scripts.

## Phase 2: Live Wireframe

- [x] Create browser-runnable HTML wireframe.
- [x] Split wireframe into modular source files.
- [x] Remove build step from wireframe workflow.
- [x] Add native HTML templates for repeated wireframe markup.
- [x] Add app shell layout.
- [x] Add native-feeling base styles.
- [x] Add light and dark theme support.
- [x] Add modern icon treatment.
- [x] Add mock project data.
- [x] Build left account tree with multiple account roots.
- [x] Add Firestore, Authentication, and JavaScript Query nodes under each account.
- [x] Lazy-load account tools on account expansion.
- [x] Show account-load error with retry action.
- [x] Add account remove action.
- [x] Build right tabbed workspace.
- [x] Add Back/Forward navigation history controls.
- [x] Add tab right-click close actions.
- [x] Add drag-and-drop tab reordering.
- [x] Add Sort by Account tab action.
- [x] Add responsive shell, collapsible sidebars, and contained panel scrolling.
- [x] Replace sidebar drawer toggle with rail-style collapse and click-to-expand icons.
- [x] Replace inspector dropdown collapse with vertical strip exposing always-visible expand button.
- [x] Add draggable splitters between sidebar/workspace and stack/inspector.
- [x] Add baseline keyboard shortcuts and `?` help overlay in wireframe.
- [x] Open account-bound tabs from tree clicks.
- [x] Add account/project dropdown to each tab toolbar.
- [x] Allow same view open against different accounts.
- [x] Build project add dialog mock.
- [x] Build Firestore tree mock.
- [x] Make Firestore collection loading lazy per account.
- [x] Make collection single-click focus existing tabs.
- [x] Make collection double-click open new tabs.
- [x] Build query builder UI.
- [x] Add query path input for collection/document path.
- [x] Keep query path input focused while editing.
- [x] Hide filters/sorts for document path queries.
- [x] Add numeric limit input beside Run.
- [x] Build result table view.
- [x] Build tree result view.
- [x] Add Load more action to table and tree result views.
- [x] Build standard indented result tree view.
- [x] Support nested subcollections in result tree view.
- [x] Add array and map field examples.
- [x] Build read-only JSON result view with typed value encoding.
- [x] Keep result overview visible across result views.
- [x] Add collapsible first-level fields/types aggregation section.
- [x] Limit selection preview accordion to table view.
- [x] Add subcollection indicator in results.
- [x] Add result right-click Open in new tab action.
- [x] Add double-click document edit modal.
- [x] Build document detail panel.
- [x] Build field-only JSON document editor mock.
- [x] Build field editor mock.
- [x] Add destructive action confirmation modal.
- [x] Build JavaScript Query editor mock.
- [x] Add JS Query streamed result output.
- [x] Collapse JS Query stream items by default.
- [x] Make JS Query output scroll independently.
- [x] Build logs/errors/results tabs.
- [x] Build Authentication users table.
- [x] Build Authentication user detail panel.
- [x] Build settings/about view.
- [ ] Review wireframe and capture page/tab specs.
- [ ] Add Playwright smoke test for primary navigation.

## Phase 3: Project Management

- [ ] Parse service account JSON.
- [ ] Validate required service account fields.
- [ ] Add emulator connection profile.
- [ ] Save project metadata locally.
- [ ] Store credential securely.
- [ ] Remove project and credential.
- [ ] Switch active project.
- [ ] Switch active target between production and emulator.
- [ ] Show active project in status bar.

## Phase 4: Firestore Read And Query

- [ ] Initialize Firebase Admin app per project.
- [ ] Initialize Firebase Admin app for emulator target.
- [ ] List root collections.
- [ ] Load document IDs for collection tree.
- [ ] Load subcollections.
- [ ] Run collection query with filters.
- [ ] Run sort clauses.
- [ ] Apply limit.
- [ ] Implement cursor pagination.
- [ ] Normalize snapshots for renderer.
- [ ] Render loading, empty, and error states.

## Phase 5: Firestore Editing

- [ ] Load full document data.
- [ ] Save full JSON document.
- [ ] Save individual field edits.
- [ ] Delete document.
- [ ] Confirm destructive actions.
- [ ] Preserve unsaved editor state on failed save.

## Phase 6: JavaScript Query

- [ ] Define script context API in `packages/script-runner`.
- [ ] Run script for active project.
- [ ] Run script against emulator target.
- [ ] Capture `console.log` output.
- [ ] Capture thrown errors.
- [ ] Detect returned document snapshot.
- [ ] Detect returned query snapshot.
- [ ] Detect returned arrays/plain data.
- [ ] Show "No data to show" for empty/unsupported returns.
- [ ] Add execution timeout.
- [ ] Move runner to isolated process before enabling real writes (within `packages/script-runner`).

## Phase 7: Authentication

- [ ] List users with pagination.
- [ ] List users from emulator target.
- [ ] Filter/search users.
- [ ] View selected user details.
- [ ] View custom claims.
- [ ] Decide whether MVP edits custom claims.

## Phase 8: Release Readiness

- [ ] Add README usage notes.
- [ ] Add safety disclaimer.
- [ ] Add build/package scripts.
- [ ] Add app icons.
- [ ] Package macOS build.
- [ ] Package Windows build.
- [ ] Package Linux build.
- [ ] Create first release checklist.
