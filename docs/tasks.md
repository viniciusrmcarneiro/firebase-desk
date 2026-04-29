# MVP Tasks

Detailed feature tasks and per-page/per-tab specs should be finalized after the live wireframe is reviewed.

## Context

Before starting any engineering work, please read all files in the `docs/` directory.

## Phase 0: Planning

- [x] Capture product scope.
- [x] Capture live wireframe requirements.
- [x] Capture architecture direction.
- [x] Capture project structure direction.
- [x] Capture repository layer requirement.
- [x] Capture emulator and e2e requirements.
- [x] Capture CI-first requirement.
- [x] Decide final app name.

## Phase 1: Live Wireframe

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
- [x] Open connection-bound tabs from tree clicks.
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
- [x] Review wireframe and capture page/tab specs.

## Phase 2: Engineering Foundation

- [x] Initialize pnpm workspace (`pnpm-workspace.yaml`, root `package.json`).
- [x] Add Turborepo (`turbo.json`) with `lint`, `typecheck`, `test`, `build`, `dev` pipelines.
- [x] Add `tsconfig.base.json` and shared config packages (`config-oxlint`, `config-dprint`, `config-tsconfig`, `config-vitest`).
- [x] Scaffold `packages/repo-contracts` with repository interfaces for projects, Firestore, JS Query, Auth, and settings.
- [x] Scaffold `packages/repo-mocks` with mock implementations.
- [x] Scaffold `packages/data-format`, `packages/ipc-schemas`, `packages/ui`, `packages/hotkeys` skeletons.
- [x] Scaffold `apps/desktop` (Electron + React + TypeScript via electron-vite).
- [x] Wire `@tanstack/react-virtual` into `packages/ui` list/table/tree primitives before any data-heavy view ships (workspace tree, query result table, query result tree, JSON viewer, Auth users table, JS Query streamed output).
- [x] Wire `@tanstack/react-hotkeys` inside `packages/hotkeys` and ship the central registry with the wireframe defaults; expose an override map via `SettingsRepository` (rebinding UI ships later).
- [x] Persist `--sidebar-width` (global) and `--inspector-width` (per query tab) via `SettingsRepository`/tab state.
- [x] Configure colocated unit test runner per package (vitest extending `config-vitest`).
- [x] Add first colocated unit test in at least `repo-mocks` and `data-format`.
- [x] Add Firebase Emulator Suite config (`firebase/emulator/`) for Firestore and Auth.
- [x] Add emulator seed fixture plan.
- [x] Scaffold `e2e/` workspace with Playwright/Electron setup.
- [x] Add first emulator-backed e2e smoke test.
- [x] Add GitHub Actions `ci.yml`.
- [x] Add GitHub Actions `e2e.yml`.
- [x] Add GitHub Actions `release.yml`.
- [x] Verify workflows run locally through equivalent pnpm scripts.

## Phase 2.5: Design System Foundation

See [design-system.md](design-system.md). Same package layout: keep `@firebase-desk/ui` (existing virtualized primitives stay; new generic controls land in the same package). Add `@firebase-desk/design-tokens` and `@firebase-desk/product-ui`.

- [x] Scaffold `packages/design-tokens` (no React): brand primitives, semantic light/dark themes, density, typography, spacing, radius, shadows, motion, z-index, focus-ring, scrollbar tokens.
- [x] Add CSS-variable generator script in `packages/design-tokens` that emits `themes.css` (covers `:root[data-theme="light"|"dark"]` blocks).
- [x] Add Tailwind + PostCSS to renderer; configure `electron.vite.config.ts`; map Tailwind colors/spacing/radius/motion to CSS variables (no hard-coded hexes in `tailwind.config.ts`).
- [x] Add Radix UI primitives, `class-variance-authority`, `tailwind-merge`, `clsx`, and `lucide-react`.
- [x] Add appearance provider (`system` / `light` / `dark`) reading from `SettingsRepository`; toggles `<html data-theme>` at runtime; honors `prefers-color-scheme` when mode is `system`. Theme registry leaves room for future named themes (e.g. `high-contrast`, `midnight`, `solarized`).
- [x] Wire global focus-ring CSS recipe (`:focus-visible` + `--focus-ring-shadow`) and scrollbar styles in renderer global stylesheet.
- [x] Add `prefers-reduced-motion` override for motion tokens.
- [x] Build first generic components in `@firebase-desk/ui`: `Button`, `IconButton`, `Input`, `Badge`, `Tooltip`, `Dialog`, `DropdownMenu`, `ContextMenu`, `Tabs`, `Panel` (+ `PanelHeader`/`PanelBody`), `Toolbar`, `EmptyState`, `InlineAlert`, `StatusBadge`. All use Radix where applicable, CVA variants, density tokens, and `data-state` styling.
- [x] Wire density token through existing virtualized primitives (`VirtualList`/`VirtualTable`/`VirtualTree` row heights default from `density.compact`).
- [x] Add Storybook to `packages/ui` (and `packages/product-ui`): one story per variant, theme/density toggle addons, light + dark backgrounds.
- [x] Add `react-resizable-panels` wrapper component (`ResizablePanelGroup`) in `@firebase-desk/ui`.
- [x] Add `cmdk` command palette shell wired to Cmd/Ctrl+K via `@firebase-desk/hotkeys`.
- [x] Add Monaco Editor wrapper (`CodeEditor`) with theme-switching tied to appearance provider; configure Monaco workers in electron-vite renderer config; lazy-load on first use.
- [x] Scaffold `packages/product-ui`: `AppShell`, `SidebarShell`, `WorkspaceShell`, `TabStrip`, `StatusBar`, `TargetModeBadge`, `ProductionWarning`, `SettingsDialog` placeholders. Imports from `@firebase-desk/repo-contracts` only (no Firebase code).
- [x] Add demo screen in `apps/desktop/src/renderer` showing AppShell, light/dark mode switching, compact density, sidebar tree (mock), tabs, status bar with `TargetModeBadge`, and placeholder Firebase panels (Firestore/Auth/JS Query). Mock data only.
- [x] Update `oxlintrc.renderer.json` `no-restricted-imports` allowlist to permit `@firebase-desk/design-tokens`, `@firebase-desk/product-ui`.
- [x] Update `docs/architecture.md` and `docs/project-structure.md` to reference the new packages.
- [x] Document deferred decisions in `design-system.md`: TanStack Table installs on first need; visual regression tooling deferred; perf/bundle budget deferred.

## Phase 3: Mocked General App

Build the complete Firebase Desk app surface before real Firebase integration. Use [product.md](product.md), [live-wireframe.md](live-wireframe.md), and `apps/wireframe` as the source of truth. All runtime data must come through `@firebase-desk/repo-contracts` and `@firebase-desk/repo-mocks`; no renderer code talks to Firebase directly.

- [x] Replace the Phase 2.5 placeholder desktop demo with a real mocked app composition.
- [x] Add an app-level repository provider wiring `MockProjectsRepository`, `MockFirestoreRepository`, `MockAuthRepository`, `MockScriptRunnerRepository`, and `MockSettingsRepository`.
- [x] Build the left account tree from `ProjectsRepository.list()`.
- [x] Lazy-load account tools under each account: Firestore, Authentication, and JavaScript Query.
- [x] Add mocked account-load loading, error, retry, and remove states.
- [x] Build workspace tab state: open, focus, close, close others, close left/right, close all, reorder, sort by account.
- [x] Add Back/Forward interaction history without duplicate tab creation.
- [x] Add account/project dropdown to each tab toolbar; switching affects only that tab.
- [x] Add status bar values for selected tree item, active tab account, target mode, and last action.
- [x] Build the Add Project mocked dialog using `ProjectsRepository.add()`.
- [x] Build settings/about view using `SettingsRepository`.
- [x] Build Firestore tree from `FirestoreRepository.listRootCollections()`.
- [x] Add collection single-click focus/open behavior and double-click new-tab behavior.
- [x] Build Firestore query tab with path input, collection/document path detection, filters, sorts, limit, reset, and run.
- [x] Build result overview with first-level field/type aggregation.
- [x] Build result table view with row selection, Load more, and double-click document editor modal.
- [x] Build result tree view with indentation, arrays, maps, nested subcollection indicators, and Load more.
- [x] Build read-only typed JSON result view.
- [x] Add result item context menu with Open in new tab.
- [x] Build document detail panel and JSON/field editor mock flows.
- [x] Add destructive confirmation modal for mocked deletes.
- [x] Build JavaScript Query tab with Monaco editor, Run, logs, errors, and collapsed streamed result items.
- [x] Build Authentication tab with users table, filter/search, selected user detail, and claims viewer.
- [x] Build command palette actions for common mocked app workflows.
- [x] Wire responsive behavior from the wireframe: splitters, collapsible sidebar rail, inspector strip, stacked panes, contained scrolling.
- [x] Add Storybook stories for the major mocked app surfaces, not only primitives.
- [x] Add unit tests as each mocked app surface is built; tests should use `@firebase-desk/repo-mocks` through repository contracts instead of hard-coded component data.
- [x] Add focused interaction tests for account tree lazy load, tab behavior, account switching, query run, document modal, JS run, Auth filter, settings, and command palette.
- [x] Keep at least one renderer smoke test proving the app boots with mocked repositories.

## Phase 4: Mock Contract Hardening

Close the gap between mocks and the real MVP behavior before swapping in Firebase adapters.

- [x] Extend mock fixtures with multiple accounts, production/emulator targets, account-load errors, empty states, and large collections.
- [x] Extend Firestore mocks with nested subcollections, map/array examples, document path reads, cursor pagination, and Firebase-like errors.
- [x] Add mock write/delete methods to contracts if the mocked editor flows need them before real Firebase editing.
- [x] Extend JavaScript Query mocks with logs, thrown errors, empty returns, arrays, plain objects, document-like values, query-like values, and streamed output fixtures.
- [x] Extend Auth mocks with enough users for pagination/search states and richer custom claims.
- [x] Add contract conformance tests covering every repository method used by the mocked app.
- [x] Add fixture builder helpers so UI tests can create targeted mock states without duplicating data.

## Phase 5: Build And Release Pipeline

Move this ahead of real Firebase integration so packaging, artifacts, and install friction are known while the app is still mocked. See [testing-ci.md](testing-ci.md), [project-structure.md](project-structure.md), and `apps/desktop/electron-builder.yml`.

- [x] Add root `pnpm package` script.
- [x] Add desktop `package` script using `electron-builder`.
- [x] Add `apps/desktop/electron-builder.yml` with macOS, Windows, and Linux targets.
- [x] Add GitHub Actions `release.yml`.
- [x] Run `release.yml` packaging on PRs and fail the PR if packaging fails.
- [x] Upload PR package outputs as temporary workflow artifacts only.
- [x] Create or update a rolling published prerelease `latest` on every merge to `main`.
- [x] Attach `latest` binaries as GitHub Release assets.
- [x] Keep `v*.*.*` tags creating versioned published prereleases.
- [x] Keep `workflow_dispatch` as an ad-hoc package smoke path.
- [x] Name workflow artifacts and release assets by channel/version, OS, architecture, and target type.
- [x] Add SHA-256 checksum files to package artifacts and release assets.
- [x] Set artifact retention for PR and ad-hoc package smoke builds.
- [x] Add app icons and builder resources for macOS, Windows, and Linux.
- [x] Add first unsigned/dev-build download notes to README.
- [x] Document expected unsigned app warnings per OS.
- [x] Add safety disclaimer to README before public binaries exist.
- [x] Verify `pnpm package` locally on the current development OS.
- [ ] Verify GitHub `release.yml` succeeds on PRs for macOS, Windows, and Linux.
- [ ] Verify GitHub `release.yml` updates `latest` on merge to `main`.
- [ ] Download every PR workflow artifact and confirm the archive/installer opens.
- [ ] Download every `latest` release asset and confirm the archive/installer opens.
- [ ] Install/open the macOS binary from PR artifacts and `latest` release assets.
- [ ] Install/open the Windows binary from PR artifacts and `latest` release assets.
- [ ] Install/open the Linux binary from PR artifacts and `latest` release assets.
- [x] Add a packaged-app smoke test or CI check that catches missing runtime files.
- [ ] Create the first versioned published prerelease from a tag.
- [x] Document no-signing decision and checksum-based verification.
- [x] Document package-manager distribution as later work.
- [x] Create first release checklist.

## Phase 6: Project Management

- [x] Parse service account JSON.
- [x] Validate required service account fields.
- [x] Add emulator connection profile.
- [x] Save project metadata locally.
- [x] Store credential securely.
- [x] Remove project and credential.
- [x] Switch active project.
- [x] Switch active target between production and emulator.
- [x] Show active project in status bar.

## Phase 7: Firestore Read And Query

- [x] Initialize Firebase Admin app per project.
- [x] Initialize Firebase Admin app for emulator target.
- [x] List root collections.
- [x] Load document IDs for query result views.
- [x] Load subcollections from result views.
- [x] Run collection query with filters.
- [x] Run sort clauses.
- [x] Apply limit.
- [x] Implement cursor pagination.
- [x] Normalize snapshots for renderer.
- [x] Render loading, empty, and error states.

## Phase 8: Firestore Editing

- [x] Review editing UX from a greenfield user-flow perspective.
- [x] Define field edit CTAs for table cells, tree nodes, and selection preview.
- [x] Keep column headers scoped to query/layout actions only.
- [x] Add field-aware context menus: edit scalar, edit JSON, set null, delete field, copy path, copy value.
- [x] Treat timestamp, reference, bytes, and geoPoint encoded values as scalar field edits.
- [x] Add field edit modal with locked field path, type selector, typed controls, cancel, and save.
- [x] Add full document JSON modal for document fields.
- [x] Add delete document confirmation modal.
- [x] Show selectable subcollections in delete document confirmation.
- [x] Add delete CTAs on result rows and tree document nodes.
- [x] Integrate tree view selection with the selection preview.
- [x] Make any node inside a document select that document for preview.
- [x] Add app-level error boundary so unexpected UI errors do not blank the app.
- [x] Validate field names using Firestore field constraints.
- [x] Validate raw JSON before save.
- [x] Validate encoded Firestore values and reference paths.
- [x] Validate full document JSON is an object.
- [x] Keep literal field names such as `id`, `path`, `subcollections`, and `a.b` as document data.
- [x] Implement mock in-memory field writes through full document saves.
- [x] Implement mock field delete and set-null behavior.
- [x] Add collection/query `Results changed` banner after writes.
- [x] Refresh paginated results from page 1 and reload the same loaded page count.
- [x] Preserve selection after refresh when the document still appears.
- [x] Add shared `FirestoreDeleteDocumentOptions` contract.
- [x] Add `firestore.saveDocument` and `firestore.deleteDocument` IPC schemas/channels.
- [x] Wire save/delete through preload, renderer repository, and main IPC registry.
- [x] Implement live `saveDocument` for emulator and production targets.
- [x] Decode encoded Firestore values before live save.
- [x] Return fresh encoded document data after live save.
- [x] Implement live `deleteDocument` for emulator and production targets.
- [x] Delete selected subcollections recursively before deleting the parent document.
- [x] Keep parent document when selected subcollection deletion fails.
- [x] Update mock repository to support selected subcollection deletes.
- [x] Call repository delete once from the app with selected subcollection paths.
- [x] Add unit tests close to field helpers, UI flows, IPC, mock repo, live repo, preload, and AppShell.
- [x] Add emulator-backed smoke test for typed writes and selected subcollection deletes.
- [x] Validate smoke writes by directly querying Firestore emulator state.
- [x] Add create document CTA for collection queries, results, and sidebar collection nodes.
- [x] Add generated-ID create flow with editable ID and JSON object validation.
- [x] Add optimistic save conflict detection with document `updateTime`.
- [x] Add editable conflict merge modal using Monaco diff editor.
- [x] Add emulator-backed smoke tests for create and conflict merge with direct REST verification.

## Phase 9: JavaScript Query

- [x] Define script context API in `packages/script-runner`.
- [x] Execute plain JavaScript only; no TypeScript/compiler step in MVP.
- [x] Run script for active connection by `connectionId`.
- [x] Expose `project.id`, `project.projectId`, `project.name`, and `project.target`.
- [x] Run script against emulator target.
- [x] Expose limited Firebase Admin context: `db`, `auth`, and `admin.firestore()`/`admin.auth()`.
- [x] Make `db.batch()` available in the sandbox.
- [x] Capture `console.log` output.
- [x] Capture thrown errors.
- [x] Detect returned document snapshot.
- [x] Detect returned query snapshot.
- [x] Detect returned arrays/plain data.
- [x] Normalize Firestore native values through encoded value format.
- [x] Show "No data to show" for empty/unsupported returns.
- [x] Run each execution in a short-lived child process.
- [x] Add user cancellation with normal cancelled result state.
- [x] Keep execution timeout deferred for post-MVP/next iteration.

## Phase 10: Authentication

- [x] List users with pagination.
- [x] List users from emulator target.
- [x] Filter/search users.
- [x] View selected user details.
- [x] View custom claims.
- [x] Decide whether MVP edits custom claims.
