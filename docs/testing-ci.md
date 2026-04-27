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

- `ci.yml`: install (pnpm), run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, publish the coverage summary, then `pnpm build`.
- `e2e.yml`: install, build affected workspaces, start Firebase emulators, seed data, run `pnpm test:e2e`, upload traces/screenshots on failure.
- `release.yml`: on PR, merge to `main`, tag, or ad-hoc dispatch, run CI checks and `pnpm package` for the desktop app. PRs always package Linux, and package macOS/Windows when the PR has the `package-all` label or touches package-sensitive paths (`apps/desktop/**`, `e2e/**`, release workflows, package scripts, or lockfile). PR and ad-hoc runs upload temporary workflow artifacts with retention. Merges to `main` create or update the rolling published prerelease `main-latest` with release assets and SHA-256 checksums. Version tags create published prereleases with release assets and SHA-256 checksums.

### Required Scripts (root `package.json`, delegated via turbo/pnpm filters)

- `pnpm format`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm build`
- `pnpm package`
- `pnpm package:linux:docker` for local Docker reproduction of the Linux release package smoke. The wrapper uses `linux/amd64` and the Docker capability required by Chromium's sandbox.
- `pnpm dev` (parallel: desktop + wireframe)

### Policy

- Workflows are added before live wireframe UI work.
- Pull requests must pass lint, typecheck, unit tests, and build.
- Pull requests must package Linux before merge. Pull requests that touch desktop packaging, packaged e2e, release workflows, package scripts, or the lockfile must also package macOS and Windows before merge; use the `package-all` label to force the full matrix.
- E2E emulator workflow must exist early, even if first specs are smoke tests.
- Release workflow must exist before the first packaged build is considered done.
- PR package outputs are workflow artifacts only, not GitHub Release assets.
- PR and manual package artifacts use short retention; main and tag artifacts use longer retention.
- Every merge to `main` updates the rolling published prerelease `main-latest`.
- Version tags create separate published prereleases.
- Unsigned builds are published intentionally with SHA-256 checksums; binary signing is not planned.
- Package-manager distribution is deferred until the direct release path is stable.
- First release phase validates unsigned app warnings and install/open smoke on each OS before Firebase feature work continues.
