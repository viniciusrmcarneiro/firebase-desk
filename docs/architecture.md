# Architecture

## Choice

Electron + React + TypeScript.

This keeps the desktop app simple while giving the JavaScript Query feature access to Node and the Firebase Admin SDK.

## Process Boundaries

### Main Process

- Owns Electron app lifecycle.
- Creates windows and native menus.
- Handles local credential storage.
- Runs Firebase Admin SDK operations.
- Exposes typed IPC handlers.

### Preload

- Exposes a narrow typed API to the renderer.
- No direct Node access in renderer.

### Renderer

- React UI.
- Local UI state.
- Calls feature repositories only.
- Never directly imports service account files, Firebase SDKs, Firebase Admin SDK, or emulator setup code.

## Repository Layer

All UI-facing data access goes through repository interfaces. UI code depends on contracts, not Firebase implementations.

```text
Renderer UI -> feature repository interface -> preload IPC client -> main IPC handler -> main repository implementation -> Firebase Admin SDK or emulator
```

### Rules

- UI components never call Firebase code directly.
- Feature hooks/components receive repository contracts or use a feature repository provider.
- Mock repositories power the live wireframe and unit tests.
- Real repositories live behind typed IPC and run outside the renderer.
- Cross-cutting behavior such as validation, logging, result normalization, pagination cursors, and emulator switching belongs in repositories/services, not UI components.

### Initial Repositories

- `ProjectsRepository`
- `FirestoreRepository`
- `ScriptRunnerRepository`
- `AuthRepository`
- `SettingsRepository`

### Script Runner

- Runs user JavaScript for the active project.
- Should become an isolated worker process before real Firebase mutations ship.
- Captures return value, stdout-like logs, thrown errors, and duration.

## Data Storage

- Project metadata: local app config.
- Service account credentials: OS keychain when possible.
- UI preferences: local config.
- No cloud sync in MVP.

## Firebase Integration

- Use Firebase Admin SDK.
- Create one app instance per configured project.
- Support production service account targets and Firebase emulator targets.
- Keep project selection explicit.
- Keep target mode explicit: production or emulator.
- Normalize Firestore snapshots into renderer-safe JSON.
- Encode Firestore-specific values with `__type__` metadata for JSON editing.
- Load Firebase data lazily. Only local project metadata is available eagerly; collections, documents, subcollections, Auth users, and script outputs are loaded on demand.

## Emulator Integration

- Firestore and Authentication must support local emulator profiles.
- E2E tests run against Firebase Emulator Suite, not production Firebase.
- Emulator seed data should be deterministic and committed with test fixtures.
- CI must start emulators before e2e tests and stop them after tests finish.

## Testing Strategy

- Unit tests live next to the code they test.
- Repository interfaces make UI tests independent from Firebase.
- Mock repositories are used for component and feature unit tests.
- Main-process repository implementations get focused unit tests around payload validation and result normalization.
- E2E tests use Firebase emulators.
- GitHub Actions run lint, typecheck, unit tests, build, e2e emulator tests, and release checks from the beginning.

## Safety Notes

- Service accounts are powerful. UI must show active project clearly.
- Mutations are allowed, especially in JavaScript Query.
- Destructive UI actions require confirmation.
- Script runner must not expose arbitrary local filesystem access long-term.

## Suggested Libraries

- electron-vite for Electron build/dev flow.
- React + TypeScript for renderer.
- TanStack Table for result/auth tables.
- `@tanstack/react-virtual` for all data-heavy lists/grids/trees (mandatory; see Virtualization below).
- `@tanstack/react-hotkeys` for keyboard shortcuts (preferred).
- Monaco Editor for JSON and JavaScript editing.
- Firebase Admin SDK for Firebase operations.
- keytar or Electron safeStorage strategy for secrets.
- Zod for IPC payload validation.

## Virtualization

All data-heavy surfaces must virtualize from day one. Use `@tanstack/react-virtual` (paired with TanStack Table where applicable). Required for:

- Workspace tree (account tree once collections/subcollections expand).
- Firestore query result table.
- Firestore query result tree (recursive, flatten before virtualizing).
- JSON tree viewer for whole documents and selection preview.
- Auth users table.
- JS Query streaming output (results, logs, errors panes).
- Tabs strip when count is large (horizontal virtualization).

Rules:

- Never render an unbounded list with `.map()` directly; wrap in a virtualizer.
- Keep row height predictable per surface; use measured rows only when content is unavoidably variable (JSON tree).
- Pagination cursors and `Load more` must work with virtualization (append, do not re-render whole list).
- Repository contracts must expose pagination so virtualized surfaces can request more rows on demand.

## Keyboard Shortcuts

- Use `npm i @tanstack/react-hotkeys` and centralize bindings in a single registry module so shortcuts are discoverable and rebindable later.
- Default keymap (mirror of the wireframe `?` overlay):
  - Global: Cmd/Ctrl+B toggle sidebar (rail), Cmd/Ctrl+\\ toggle result overview, Cmd/Ctrl+K focus tree filter, Cmd/Ctrl+T new tab (duplicate active type), Cmd/Ctrl+W close active tab, Cmd/Ctrl+1..9 switch tab, Alt+←/→ history back/forward, Cmd/Ctrl+, settings, ? show shortcut help, Esc close modal/menu/drawer.
  - Query tab: Cmd/Ctrl+L focus query path, Cmd/Ctrl+Enter run query.
  - JS Query tab: Cmd/Ctrl+Enter run script.
  - Auth tab: / focus user search.
- Bindings must skip when focus is in editable inputs unless explicitly allowed (Cmd/Ctrl+Enter, Esc).
- `SettingsRepository` must expose a future hotkey-overrides map so users can rebind defaults.

## Resizable Layout

- Sidebar and inspector widths.
- Drag splitters update the variable directly during drag; persist final values via `SettingsRepository` (global) and per-tab state (inspector) once Phase 1 lands.
- Collapsed sidebar becomes a 48px rail with section icons; clicking any rail icon expands the sidebar and selects the corresponding account/section.
- Collapsed inspector becomes a ~40px vertical strip with an always-visible expand button.
