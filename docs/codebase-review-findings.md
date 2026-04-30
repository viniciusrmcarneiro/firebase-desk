# Codebase Review Findings

Date: 2026-04-30
Scope: static review of repo structure, renderer/main flows, packages (~419 source files), tests, checks.

Execution roadmap: [codebase-review-tasks.md](codebase-review-tasks.md).

Severity:

- P1: likely user-visible bug / leak / boundary risk.
- P2: maintainability, coverage, architecture risk.
- P3: cleanup / hygiene.

## Strengths

- Strict TypeScript repo-wide: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, project refs.
- IPC channel registry centralized in `packages/ipc-schemas/src/channels.ts`; both-sides zod validation.
- App-core pattern in place: pure transitions/commands well separated and tested in isolation.
- Live and mock Firestore repos are interface-compatible.
- Clean package boundaries; `@firebase-desk/ui` verified domain-free (no Firebase imports).
- Shared codec in `data-format` prevents encoder drift.
- Electron renderer has `contextIsolation: true` and `sandbox: true`.
- Firestore write commands record activity on success, conflict, and failure.
- E2E hits real emulator create/edit/conflict/delete/activity export flows.
- Service account parsing validates required fields before production save.
- Credentials use `safeStorage` when available; unencrypted fallback surfaced in project metadata.
- Main storage uses atomic writes for JSON/settings and credentials.
- UI surfaces have visible loading/empty/error states in many core flows.

---

## P1 — Bugs / leaks / boundary risks

### App boot can hang forever on config/settings failure

- `apps/desktop/src/renderer/app/App.tsx:55-74` calls `loadInitialDataMode()` and `repositories.settings.load()` without `.catch`.
- `apps/desktop/src/renderer/app/App.tsx:76` keeps showing splash until `snapshot` exists.
- Tests cover pending and success only.

Risk: failed IPC/settings load → unhandled rejection + permanent splash. Violates "surface real error states".

Fix: explicit `loading | ready | failed` boot state; render fatal boot error with retry/open data dir; tests for `getConfig` and `settings.load` rejection.

### Script worker can leak child processes after completed scripts

- User VM exposes `setTimeout`/`setInterval` (`packages/script-runner/src/runner.ts:114-117`).
- Worker only sets `process.exitCode` and disconnects (`worker-process.ts:43-47`).
- Parent resolves on first result (`process-runner.ts:77-85`), removes active run, never kills child.

Risk: `setInterval(()=>{},1000); return 1;` returns but worker stays alive; repeated runs leak.

Fix: in worker, `process.exit(exitCode)` after sends flush, or own/clear exposed timers; parent kills child after final result if not exited; optional max runtime; test for lingering interval, spawn failure, malformed worker message, listener-throws, hung-worker.

### Firestore IPC boundary under-validates paths

- `FirestoreQuerySchema.path` only `z.string()` (`ipc-schemas/src/firestore.ts:94-99`).
- `firestore.listSubcollections` and `firestore.getDocument` use plain `documentPath: z.string()` (`channels.ts:117-127`).
- `ListDocumentsRequestSchema.collectionPath` plain string.

Risk: boundary validation inconsistent; main rejects later, mock may not; renderer/main contract drift.

Fix: reuse `CollectionPathSchema` / `DocumentPathSchema` for all Firestore IPC requests; negative schema tests; keep repo asserts.

---

## Architecture / cross-concern violations

- **`useFirestoreTabState` lines 125-160** has a `useEffect`-driven page-reload watcher. Per `docs/app-core-pattern.md` this should be a pure selector + command. AGENTS.md forbids this pattern.
- **Activity recording scattered across hooks** (`useFirestoreTabState`, `useJsTabState`, `useAuthTabState`) instead of driven from commands which already detect completion via transitions. `recordScriptActivityOnce` is invoked from a hook event handler.
- **Tab close cleanup duplicated** between `closeTabsWithCleanup` (AppShell.tsx#L734-L780) and `clearJsQueryTabCommand` (useJsTabState.ts#L79-L82). Should be one app-core command.
- **`TabView` has 43 props** — pure prop-drilling; should be 3-4 grouped action objects.
- **AppShell is too large** (1,359 lines): layout + activity + settings + tabs + query + write + auth + JS + destructive dialogs + status + persistence. Continue migration: extract tab lifecycle/close cleanup, command palette model, project tree actions, and active-tab refresh into app-core/adapters.
- **Firestore write workflow split** between app-core (`firestoreWriteState.ts`) and product-ui. `FirestoreQuerySurface.tsx:120-229` owns conflict/stale/create modal state and settings loads. Move conflict, stale field patch, create request handling, and action notices into app-core selectors/commands. Product UI renders models and emits intent.
- **Durable workspace state in localStorage** (`workspacePersistence.ts:121-146`); `savePersistedWorkspaceState` swallows all failures. Persist via settings/main storage repository or surface failures through status/activity.

---

## Large files — concrete splits

|  LOC | File                                                                                | Why split                                                               | Suggested split                                                                                                                                                       |
| ---: | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1359 | `apps/desktop/src/renderer/app/AppShell.tsx`                                        | Tab mgmt + project switching + dialogs + hotkeys + persistence + render | `useTabController`, `useProjectController`, `useAppHotkeys`, `<DialogCoordinator>`; AppShell ~400 lines layout                                                        |
| 1057 | `packages/product-ui/src/features/feature-surfaces.test.tsx`                        | 5 surfaces, mocks 8+ UI components                                      | Split: `auth-surfaces.test.tsx`, `firestore-surfaces.test.tsx`, `projects-surfaces.test.tsx`, `workspace-surfaces.test.tsx`                                           |
|  629 | `packages/repo-mocks/src/firestore.ts`                                              | Path utils + comparison + field-patch + repo mixed                      | Extract `firestore-path-utils`, `firestore-comparison`, `firestore-field-patch` (shared with repo-firebase)                                                           |
|  617 | `apps/desktop/src/renderer/app/AppShell.test.tsx`                                   | Many workflows in one suite                                             | Split by workflow                                                                                                                                                     |
|  593 | `packages/product-ui/src/features/firestore/FirestoreQuerySurface.editing.test.tsx` |                                                                         | Split by save/patch/delete/conflict                                                                                                                                   |
|  574 | `packages/product-ui/src/features/firestore/FirestoreQuerySurface.tsx`              | UI + write workflow state, multiple modal state machines                | `FirestoreQuerySurfaceView` + controller hooks per modal                                                                                                              |
|  548 | `e2e/specs/firestore-smoke.spec.ts`                                                 |                                                                         | Split by workflow                                                                                                                                                     |
|  448 | `apps/desktop/src/main/ipc/registry.ts`                                             | 23 channels in one handlers map                                         | `firestore-handlers.ts`, `auth-handlers.ts`, `script-runner-handlers.ts`, `activity-handlers.ts`, `projects-handlers.ts`, `settings-handlers.ts`; registry ~100 lines |
|  441 | `packages/repo-firebase/src/firestore-repository.ts`                                | Shared validators/helpers candidate                                     | See DRY section                                                                                                                                                       |
|  431 | `apps/desktop/src/renderer/app-core/firestore/write/firestoreWriteCommands.ts`      | 4 near-identical command bodies                                         | `executeWriteCommand<T>()` helper handling start/success/failure + activity + invalidation; commands shrink ~40 lines each                                            |
|  408 | `packages/product-ui/src/features/firestore/resultModel.tsx`                        | Value classification + tree flattening + helpers                        | Split into 3 modules                                                                                                                                                  |

---

## Contract drift (mock vs live)

### Mock Firestore accepts invalid paths the live repo rejects

- Mock `listDocuments`, `listSubcollections`, `runQuery`, `getDocument` skip path validation (`repo-mocks/src/firestore.ts:56-99`).
- Live repo validates before Admin SDK (`repo-firebase/src/firestore-repository.ts:55-88`).

Fix: shared path validators in `repo-contracts` or `data-format`; run same contract tests against mock and live-repo-with-fake-provider.

### Mock Auth default pagination differs

- Mock default `limit = users.length` (`repo-mocks/src/auth.ts:7-15`).
- Live default `25`, max `1000` (`repo-firebase/src/auth-repository.ts:5-17`).

Fix: align defaults; contract test for `listUsers(projectId)` without explicit limit.

### Mock project add skips live validation

- Mock `add` writes raw input (`repo-mocks/src/projects.ts:24-36`).
- Main `normalizeAddInput` requires production service-account JSON and project id match (`main/projects/main-projects-repository.ts:94-104`).

Fix: share normalization or duplicate tests across main and mock repos; add mock contract tests for empty names, production without credential, project id mismatch.

---

## Error handling / failure visibility

### Stored settings corruption silently reset

- `SettingsStore.readFile` returns defaults on parse failure (`main/storage/settings-store.ts:45-55`).

Fix: surface as recoverable error: backup file, show reset/import action; defaults only after explicit recovery or with visible warning/activity.

### Activity log drops corrupt lines silently

- Invalid JSONL lines return `[]` (`main/storage/activity-log-store.ts:47-58`).

Fix: count skipped lines and warn in Activity/settings; backup/export raw file before pruning.

### Product UI persistence hooks swallow settings failures

- Field catalog load/save catches to empty/`undefined` (`product-ui/src/features/firestore/fieldCatalog.ts:62-99`).
- Result table layout load/save catches to empty/`undefined` (`product-ui/src/features/firestore/resultTableLayout.ts:38-76`).

Fix: surface error to owning surface or record settings activity failure; keep silent fallback only for read-only story/test mode.

### Hotkey override loading can reject unhandled

- `packages/hotkeys/src/HotkeysProvider.tsx:20-28` calls `settings.getHotkeyOverrides().then(...)` with no catch.

Fix: catch, keep defaults, expose optional `onError`/activity hook; tests for failed override load and editable-target gating.

---

## Duplicated logic (DRY)

- **Firestore value type handling duplicated 3+ ways**: `firestoreValueType` in `FirestoreValueCell.tsx`, `valueType` in `resultModel.tsx`, `editableTypeForValue` in `fieldEditModel.ts`, icon switch in `FieldAutocompleteInput.tsx`. Unify in one `firestoreTypeRegistry` keyed by `__type__`.
- **`fieldPatchHasChangedRemoteValue`, `getNestedValue`, `deepEqual`, `sortJson`, `sortedEntriesByKey`** implemented identically in `repo-firebase/src/firestore-repository.ts:379-430` and `repo-mocks/src/firestore.ts:561-619`. Move to a shared package (`packages/firestore-field-patch` or extend `data-format`).
- **Tree node id builders** in `workspaceModel.ts` are 5 near-identical functions — parameterize with a kind.
- **Repeated small helpers** across files:
  - `messageFromError`: app-core, dialogs, product-ui, AppShell, useFirestoreTabState, useWorkspaceTree.
  - `elapsedMs`: project/auth/settings/firestore/AppShell commands.
  - `isPlainObject`: data-format, repo-firebase, repo-mocks, script-runner, product-ui.
  - `pathParts`, field path validation, UTF-8 byte length: ipc-schemas, repo-firebase, repo-mocks, field edit model.
  - settings clone helpers: main settings repo/store, mock settings repo.
    Move to narrow shared modules (`repo-contracts` / `data-format` / app-core shared).
- **`DEFAULT_LIMIT = 25`** duplicated in repo-firebase, repo-mocks, auth-repository → `repo-contracts`.
- **Magic strings**: tree node kinds, IPC channel names, activity areas, result tree node kinds (`'branch'`, `'leaf'`, `'load-more'`) → const enums.
- **Duplicate `useMediaQuery`**: shared at `product-ui/src/hooks/useMediaQuery.ts:1-20`; local copy in `AuthUsersSurface.tsx:420-436`.
- **Hand-rolled sorting where native sort is enough**: `sortedJson.ts` merge sort; `sortedEntriesByKey` insertion sort; `fieldCatalog.sortedBy` insertion sort.

---

## Tests / checks

### Build emits test declarations

Package tsconfigs include all `src/**/*` (e.g. `packages/product-ui/tsconfig.json`, `packages/ui/tsconfig.json`, `packages/repo-firebase/tsconfig.json`). Build output contains many `*.test.d.ts` under `.build/dist`. `packages/product-ui/tsconfig.json:9` references `repo-mocks` because tests are in build graph.

Fix: separate `tsconfig.build.json` excluding `*.test.*`, stories, test setup. Typecheck tests in `tsconfig.test.json` or Vitest.

### Root `pnpm test` does not run e2e

Root test is `turbo run test`; e2e `test` script only echoes — real command is `test:withEmulators`. Document and/or add `pnpm test:smoke` or root `test:all`.

### IPC registry tests are thin

`registry.ts` is 448 lines; `registry.test.ts` only checks script event broadcast. Mock `ipcMain.handle`, call registered handlers, assert schema parse failures and success transforms; assert every `IPC_CHANNELS` key has a handler.

### Hotkeys package has no tests

0 `*.test.*` files. Tests for `resolveBinding`, `isEditableTarget`, provider failed load, handler suppression. AppShell only tests theme toggle; back/forward/run/cancel/tree-focus untested.

### Mock-heavy product tests hide real behavior

`feature-surfaces.test.tsx:25-120` mocks virtualizer, Monaco, `DataTable`, `ExplorerTree`, `VirtualList`, `VirtualTree`. `AppShell.firestoreWrites.test.tsx` mocks the entire `FirestoreQuerySurface` with a hand-written state machine — brittle and hides real surface bugs.

Fix: keep small adapter mocks for Monaco/virtualizer; reduce `@firebase-desk/ui` full replacements; add integration tests with real `DataTable`/`ExplorerTree` for one Firestore/Auth surface each.

### DataTable accessibility under-tested

`packages/ui/src/VirtualTable.tsx:75-175` renders table-like content as bare `div`s with no `table/grid`, `row`, `columnheader`, or cell roles. `DataTable.test.tsx` checks text/clicks/layout, not roles or keyboard navigation.

Fix: implement ARIA grid semantics with roving focus (or rename primitive); role-based tests for row/cell/header semantics and keyboard row selection.

### Duplicate / overlapping coverage

- `AppShell.firestoreWrites.test.tsx` (255 lines, 3 tests) duplicates write coverage that belongs in `firestoreWriteCommands.test.ts`.
- `feature-surfaces.test.tsx` Firestore tests overlap with `FirestoreQuerySurface.editing.test.tsx`.

### Missing tests

- App boot error states: config load fail, settings load fail, retry.
- Script runner: lingering interval after return, max runtime, child killed after result, invalid worker message schema, spawn failure, listener-throws, hung-worker.
- IPC registry: every channel registered; invalid request rejected; response transform checked.
- Mock/live repo contracts: invalid Firestore paths, default pagination, production project add validation, custom claims non-object, cursor expiry, deep subcollection validation, `deleteNestedValue` on missing paths.
- `firestore-repository.test.ts`: transaction-abort, batch-write, listener cleanup, reserved-field-name cases.
- Hotkeys: override load failure, editable suppression, allow-in-editable.
- DataTable/VirtualTable: ARIA roles, keyboard navigation, selected row semantics, resize cleanup on unmount.
- Storage: `ProjectsStore` invalid/corrupt file behavior; `CredentialsStore` decrypt failure and project id filename collisions; atomic write cleanup on write/rename failure.
- Product UI real-component integration: Firestore surface with real `DataTable` and context menu; Auth surface with real table roles/selection.
- Isolated unit tests for `useFirestoreTabState`, `useJsTabState`, `useAuthTabState`, `useWorkspaceTree` (extract pure `selectFirestoreTabModel()` first).
- `ActivityDrawer.tsx` has no test file.
- `QueryBuilder.tsx` confirmation dialogs untested.
- `SettingsDialog` density change & retention MB input untested.
- Workspace persistence: tab-id collision/partial-restore.
- Race conditions around page reload + in-flight fetch + query change.

---

## UI / product copy

### Settings dialog credential copy false in live mode

`product-ui/src/settings-dialog/SettingsDialog.tsx:305-308` always says "Mock mode only. No credentials are read." Settings dialog also exposes live/mock data mode in same UI.

Fix: pass current data mode/credential state in; live-specific copy: encrypted/plain fallback, data dir, credential files.

### Renderer has no explicit CSP

`apps/desktop/src/renderer/index.html` has no `Content-Security-Policy` meta. Add production CSP compatible with Vite/Electron assets and Monaco workers; relaxed dev CSP only behind dev env.

---

## Smaller smells

- **`loggedQueryRuns = useRef<Set<string>>()`** in `useFirestoreTabState` — imperative dedupe inside selectors. Track in app-core state.
- **`deepEqual` via `JSON.stringify(sortJson(...))`** — fragile to circular refs; guard or use structured-clone equality.
- **`process-runner.ts`**: message listener never removed if process exits early; `.send()` not guarded by `!child.killed`; deeply nested ternary in `errorRunResult`.
- **Response zod parsing happens after side-effects** in `registry.ts` — fine for safety, but consider eager validation in write-heavy paths.
- **Switch-on-type chains** (8+ branches) in `FieldEditModal`, `FirestoreValueCell`, `fieldEditModel` — collapse into the proposed type registry.
- **Object spread in `appendDocumentTreeRows`** loops — heavy alloc for 1000+ docs; consider memoization.
- **Native `<select>` in `FieldEditModal.tsx`** missing `aria-label`. Audit other native form controls.
- **`uniqueSmokeId()`** in e2e uses timestamp + random slice; use `crypto.randomUUID()`.

---

## Package boundaries

Renderer has `no-restricted-imports` in `packages/config-oxlint/oxlintrc.renderer.json`. Package-level rules ("`@firebase-desk/ui` must not import repo/product packages") not enforced by lint config. Code is currently clean.

Fix: package-specific lint configs or a small dependency-boundary test; assert forbidden imports for `packages/ui`, `packages/repo-contracts`, main/renderer split.

---

## Suggested fix order (high-ROI first)

1. Fix script worker lifetime leak.
2. Add app boot failure UI/tests.
3. Tighten Firestore IPC schemas (reuse path schemas).
4. Move page-reload watcher out of `useFirestoreTabState` into app-core.
5. Extract `executeWriteCommand` helper in `firestoreWriteCommands.ts`.
6. Split `ipc/registry.ts` by domain; add per-channel handler tests.
7. Extract shared field-patch / deep-equal / path utils between repo-firebase and repo-mocks; align mock/live behavior with shared contract tests.
8. Build `firestoreTypeRegistry` to collapse value-type duplication.
9. Split AppShell into hooks/dialog coordinator; move Firestore write conflict/stale workflow fully into app-core.
10. Split build tsconfigs so tests do not emit.
11. Add hotkeys + DataTable accessibility tests.
12. Split `feature-surfaces.test.tsx`; consolidate write tests in command tests.
13. DRY shared validators/helpers; magic-string enums; align `DEFAULT_LIMIT`.
