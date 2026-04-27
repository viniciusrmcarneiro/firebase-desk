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
- [ ] Run `release.yml` packaging on PRs and fail the PR if packaging fails.
- [ ] Upload PR package outputs as temporary workflow artifacts only.
- [ ] Create or update a rolling draft prerelease `main-latest` on every merge to `main`.
- [ ] Attach `main-latest` binaries as GitHub Release assets.
- [ ] Keep `v*.*.*` tags creating versioned draft GitHub Releases.
- [ ] Keep `workflow_dispatch` as an ad-hoc package smoke path.
- [ ] Name workflow artifacts and release assets by channel/version, OS, architecture, and target type.
- [ ] Set artifact retention for PR and ad-hoc package smoke builds.
- [ ] Add app icons and builder resources for macOS, Windows, and Linux.
- [ ] Add first unsigned/dev-build download notes to README.
- [ ] Document expected unsigned app warnings per OS.
- [ ] Add safety disclaimer to README before public binaries exist.
- [ ] Verify `pnpm package` locally on the current development OS.
- [ ] Verify GitHub `release.yml` succeeds on PRs for macOS, Windows, and Linux.
- [ ] Verify GitHub `release.yml` updates `main-latest` on merge to `main`.
- [ ] Download every PR workflow artifact and confirm the archive/installer opens.
- [ ] Download every `main-latest` release asset and confirm the archive/installer opens.
- [ ] Install/open the macOS binary from PR artifacts and `main-latest` release assets.
- [ ] Install/open the Windows binary from PR artifacts and `main-latest` release assets.
- [ ] Install/open the Linux binary from PR artifacts and `main-latest` release assets.
- [ ] Add a packaged-app smoke test or CI check that catches missing runtime files.
- [ ] Create the first versioned draft GitHub Release from a tag.
- [ ] Document signing/notarization/code-signing as deferred or required before public release.
- [ ] Create first release checklist.

## Phase 6: Project Management

- [ ] Parse service account JSON.
- [ ] Validate required service account fields.
- [ ] Add emulator connection profile.
- [ ] Save project metadata locally.
- [ ] Store credential securely.
- [ ] Remove project and credential.
- [ ] Switch active project.
- [ ] Switch active target between production and emulator.
- [ ] Show active project in status bar.

## Phase 7: Firestore Read And Query

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

## Phase 8: Firestore Editing

- [ ] Load full document data.
- [ ] Save full JSON document.
- [ ] Save individual field edits.
- [ ] Delete document.
- [ ] Confirm destructive actions.
- [ ] Preserve unsaved editor state on failed save.

## Phase 9: JavaScript Query

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

## Phase 10: Authentication

- [ ] List users with pagination.
- [ ] List users from emulator target.
- [ ] Filter/search users.
- [ ] View selected user details.
- [ ] View custom claims.
- [ ] Decide whether MVP edits custom claims.
