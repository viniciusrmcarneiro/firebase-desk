# Codebase Review Tasks

## Goal

Turn [codebase-review-findings.md](codebase-review-findings.md) into an execution roadmap.

This document tracks implementation. The findings doc remains the evidence/source document.

## Rules

- Work phase by phase.
- Keep each phase behavior-preserving unless the task explicitly changes user-visible behavior.
- Add or update tests close to changed code.
- Check acceptance criteria before marking a phase complete.
- Commit once per completed phase.
- Do not mix unrelated cleanup into a phase.

## Phase 0: Roadmap

- [x] Create this task document.
- [x] Link it from the findings document.
- [x] Keep this document updated as phases complete.

Acceptance criteria:

- [x] The task doc names every phase from the findings.
- [x] Each phase has concise acceptance criteria.
- [x] The findings doc links here.

## Phase 1: Reliability And Boundary Fixes

- [x] Fix script worker lifetime leaks.
  - Ensure scripts that return while timers are active do not leave child processes running.
  - Kill or exit workers after final result/error/cancel.
  - Clean up listeners on exit/error.
- [x] Add explicit app boot failure state.
  - Handle config load failure.
  - Handle settings load failure.
  - Show a recoverable error UI with retry.
- [x] Tighten Firestore IPC path validation.
  - Use shared collection/document path schemas for query, list, get, and subcollection requests.
  - Keep repo-level validation as defense in depth.
- [x] Surface currently swallowed persistence/load failures.
  - Settings corruption.
  - Activity JSONL corruption.
  - Product UI field catalog/table layout load/save failures.
  - Hotkey override load failures.

Acceptance criteria:

- [x] P1 findings have regression tests.
- [x] App boot never hangs forever after config/settings failure.
- [x] Script worker tests prove no lingering child after returned script with active interval.
- [x] Firestore IPC schemas reject invalid collection/document paths.
- [x] Persistence/load failures are visible via UI, status, or Activity.

## Phase 2: Mock And Live Contract Parity

- [x] Share or align Firestore path validation between live and mock repositories.
- [x] Align Auth default pagination between live and mock repositories.
- [x] Align mock project add validation with main repository behavior.
- [x] Add shared contract tests where practical.
- [x] Cover custom claims shape, cursor expiry, deep subcollection validation, and missing nested delete paths.

Acceptance criteria:

- [x] Mock and live repositories accept/reject the same core Firestore paths.
- [x] `listUsers(projectId)` has the same default limit in live and mock.
- [x] Mock project add rejects invalid production inputs.
- [x] Contract tests fail against old behavior and pass against new behavior.

## Phase 3: App-Core Workflow Cleanup

- [x] Move Firestore page-reload watcher behavior out of hook-only effects.
- [x] Move Activity completion recording into command paths where commands own completion.
- [x] Track query activity dedupe in app-core state instead of hook refs.
- [x] Unify tab-close cleanup in one app-core path.
- [x] Move Firestore write conflict/stale/create modal workflow state fully into app-core.
- [x] Replace durable workspace `localStorage` persistence with an app storage/settings path or visible failure handling.

Acceptance criteria:

- [x] React adapters render state and dispatch intent; workflow rules live in app-core.
- [x] Page reload, Activity completion, tab close cleanup, and write conflict flows have app-core tests.
- [x] Existing AppShell integration behavior is unchanged.
- [x] Workspace persistence failures are not silently swallowed.

## Phase 4: IPC And Shell Structure Cleanup

- [x] Split main IPC registry handlers by domain.
  - Firestore.
  - Auth.
  - Script runner.
  - Activity.
  - Projects.
  - Settings.
- [x] Add registry tests that assert every IPC channel has a handler.
- [x] Add request/response schema tests for registered handlers.
- [x] Extract `executeWriteCommand<T>()` or equivalent to reduce duplicated write command bodies.
- [x] Split AppShell responsibilities into controllers/coordinators.
  - Tab/project controller.
  - Hotkeys controller.
  - Dialog coordinator.
  - Command palette model.
- [x] Reduce `TabView` prop drilling into grouped models/actions.

Acceptance criteria:

- [x] Main IPC registry is mostly composition, not domain logic.
- [x] Every `IPC_CHANNELS` key is covered by a handler registration test.
- [x] Firestore write command tests still cover success, failure, conflict, and stale cases.
- [x] AppShell is smaller and remains behavior-compatible.
- [x] `TabView` props are grouped by concern.

## Phase 5: Shared Firestore And Value Utilities

- [ ] Extract shared field patch helpers used by live and mock repositories.
  - Nested get/delete.
  - Remote-change detection.
  - Deep equality.
  - Stable JSON sorting/comparison.
- [ ] Add `firestoreTypeRegistry` for value type labels, icons, scalar/editable classification, and encoded `__type__` handling.
- [ ] Replace duplicated tree node ID builders with a parameterized helper.
- [ ] Move repeated helpers to narrow shared modules.
  - `messageFromError`.
  - `elapsedMs`.
  - `isPlainObject`.
  - path parts and UTF-8 byte length validation.
  - settings clone helpers.
- [ ] Move shared default limits and common magic strings to typed constants.
- [ ] Replace hand-rolled sorting with native sort where it is enough.

Acceptance criteria:

- [ ] Live and mock Firestore field-patch behavior uses the same helper implementation.
- [ ] Product UI Firestore value rendering/editing uses one registry source.
- [ ] Duplicate helper implementations listed in the findings are removed or intentionally documented.
- [ ] Shared utilities have focused unit tests.

## Phase 6: Tests, Build Output, And Accessibility

- [ ] Split package build tsconfigs so tests/stories do not emit declarations.
- [ ] Add a documented root smoke command or `test:all` path for emulator e2e.
- [ ] Add complete IPC registry coverage.
- [ ] Add hotkeys package tests.
- [ ] Add DataTable/VirtualTable ARIA and keyboard tests.
- [ ] Reduce mock-heavy product surface tests.
- [ ] Split large test files by feature/workflow.
- [ ] Consolidate duplicate AppShell/write tests into app-core command tests where possible.
- [ ] Add missing storage, product integration, query builder, settings, workspace persistence, and race-condition tests from the findings.

Acceptance criteria:

- [ ] Build output no longer includes `*.test.d.ts` or story declarations.
- [ ] Hotkeys tests cover overrides, editable suppression, and allow-in-editable behavior.
- [ ] DataTable/VirtualTable exposes tested roles and keyboard behavior or is explicitly renamed away from table semantics.
- [ ] Product integration tests use real table/tree components for at least one Firestore and one Auth path.
- [ ] Large test files are split without losing coverage.

## Phase 7: UI, Security, Storage, And Boundary Polish

- [ ] Fix Settings dialog credential copy for live mode.
- [ ] Add renderer CSP compatible with production build and Monaco.
- [ ] Add package dependency-boundary checks.
- [ ] Improve corrupted settings recovery.
- [ ] Improve corrupted Activity log recovery/export.
- [ ] Address smaller smells when adjacent to touched code.
  - `deepEqual` circular guard or safer equality.
  - `process-runner` send/listener cleanup.
  - native form labels.
  - e2e `uniqueSmokeId()` using `crypto.randomUUID()`.
  - heavy tree-row allocation where measurable.

Acceptance criteria:

- [ ] Settings credential copy matches mock/live state.
- [ ] Production renderer has an explicit CSP.
- [ ] Package boundary tests prevent `ui` and `repo-contracts` dependency drift.
- [ ] Corrupt settings/activity files are backed up or recoverable with visible user feedback.
- [ ] Smaller smells are fixed with tests or left as documented follow-up.

## Verification Gates

Every phase:

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`

Emulator-facing phases:

- [ ] `pnpm --dir e2e test:withEmulators`

Docs-only phases:

- [ ] `pnpm format:check`

Manual checks when UI behavior changes:

- [ ] Run the app.
- [ ] Exercise changed workflow in mock mode where applicable.
- [ ] Exercise changed workflow in live emulator mode where applicable.
- [ ] Verify Activity/status/error behavior.

## Completion Criteria

- [ ] All P1 findings are fixed and tested.
- [ ] Mock/live contract drift has shared coverage.
- [ ] App-core owns workflow rules; React adapters stay thin.
- [ ] Build/test output no longer includes avoidable generated noise.
- [ ] Major accessibility and security gaps are closed.
- [ ] Findings doc has no untracked actionable item without a task here.
