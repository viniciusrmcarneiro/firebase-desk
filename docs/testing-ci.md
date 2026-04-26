# Testing And CI

## Testing Rules

- UI code uses repository contracts only.
- Unit tests are colocated with the code under test.
- Mock repositories are first-class test fixtures.
- E2E tests use Firebase Emulator Suite.
- No automated test should require production Firebase credentials.

## Unit Tests

- Components test rendering, user actions, loading states, empty states, and errors with mocked repositories.
- Repository contract tests verify each implementation returns the same normalized shapes where practical.
- Main-process tests cover Firebase result normalization, IPC validation, and credential metadata handling.
- Script runner tests cover logs, returned values, empty returns, thrown errors, and timeout behavior.

## E2E Tests

- Start Firestore and Authentication emulators.
- Seed deterministic test data.
- Launch the Electron app against emulator profile.
- Test primary flows: project target selection, Firestore tree, query, table/JSON toggle, document edit, JS Query, Auth user lookup.
- Never connect to production Firebase.

## GitHub Actions From Day One

### Required Workflows

- `ci.yml`: install, lint, typecheck, unit tests, build.
- `e2e.yml`: install, build, start Firebase emulators, seed data, run e2e tests, upload traces/screenshots on failure.
- `release.yml`: on tag or manual dispatch, run CI checks, package macOS/Windows/Linux artifacts, create draft release.

### Required Scripts

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run package`

### Policy

- Workflows are added before live wireframe UI work.
- Pull requests must pass lint, typecheck, unit tests, and build.
- E2E emulator workflow must exist early, even if first specs are smoke tests.
- Release workflow must exist before the first packaged build is considered done.
