# Testing And CI

## Testing Rules

- UI code uses repository contracts only (`packages/repo-contracts`).
- Unit tests are colocated with the code under test, inside the owning package/app.
- Each package extends `packages/config-vitest`; turbo runs `test` across all packages with caching.
- `packages/repo-mocks` is the first-class test fixture for UI/feature tests.
- E2E tests live in the `e2e/` workspace and use the Firebase Emulator Suite.
- No automated test should require production Firebase credentials.

## Unit Tests

- Components test rendering, user actions, loading states, empty states, and errors with `repo-mocks`.
- Repository contract tests live in `packages/repo-contracts` (or a shared `repo-contract-tests` helper) and verify each implementation (`repo-mocks`, `repo-firebase`) returns the same normalized shapes.
- `packages/repo-firebase` tests cover Firebase result normalization, IPC payload validation (via `ipc-schemas`), and credential metadata handling.
- `packages/script-runner` tests cover logs, returned values, empty returns, thrown errors, and timeout behavior.
- `packages/data-format` tests cover encode/decode round-trips for every `__type__`.

## E2E Tests

- Start Firestore and Authentication emulators.
- Seed deterministic test data.
- Launch the Electron app against emulator profile.
- Test primary flows: project target selection, Firestore tree, query, table/JSON toggle, document edit, JS Query, Auth user lookup.
- Never connect to production Firebase.

## GitHub Actions From Day One

### Required Workflows

- `ci.yml`: install (pnpm), restore turbo cache, run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- `e2e.yml`: install, build affected workspaces, start Firebase emulators, seed data, run `pnpm test:e2e`, upload traces/screenshots on failure.
- `release.yml`: on tag or manual dispatch, run CI checks, run `pnpm package` for the desktop app, package macOS/Windows/Linux artifacts, create draft release.

### Required Scripts (root `package.json`, delegated via turbo/pnpm filters)

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`
- `pnpm package`
- `pnpm dev` (parallel: desktop + wireframe)

### Policy

- Workflows are added before live wireframe UI work.
- Pull requests must pass lint, typecheck, unit tests, and build.
- E2E emulator workflow must exist early, even if first specs are smoke tests.
- Release workflow must exist before the first packaged build is considered done.
- Turbo remote cache should be enabled in CI as soon as a cache backend is chosen.
