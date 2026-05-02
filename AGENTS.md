- Be concise. Prefer facts over polish. Commit messages too.

## Product

- Firebase Desk is an Electron desktop app for Firebase admin/data workflows.
- The app should feel like a focused work tool: dense, direct, accessible, and predictable.
- Surface real loading, empty, and error states. Do not hide or swallow failures.
- Prefer explicit user actions over surprising background work.

## Repo

- `apps/desktop`: Electron main, preload, and renderer integration.
- `apps/storybook`: UI review and interaction stories.
- `packages/ui`: domain-free primitives only.
- `packages/product-ui`: Firebase-aware UI and feature surfaces.
- `packages/repo-contracts`: shared contracts and value shapes.
- `packages/ipc-schemas`: zod validation for IPC boundaries.
- `packages/repo-firebase`: live Firebase Admin repositories.
- `packages/repo-mocks`: mock repositories and fixtures.
- `packages/script-runner`: JavaScript query runner.
- `e2e`: Electron Playwright smoke coverage.

## Architecture

- Keep package boundaries clean. `@firebase-desk/ui` must not import Firebase, repo contracts, or app-specific types.
- Put reusable Firebase-aware UI in `@firebase-desk/product-ui`, not inside one surface file.
- Keep live and mock repositories contract-compatible.
- Validate process boundaries with schemas; do not trust renderer input.
- Use shared encoders/decoders for Firebase values instead of ad hoc object handling.
- Store durable user preferences in app settings, not browser storage.
- For renderer workflows, follow `docs/app-core-pattern.md`: pure app-core transitions, explicit commands, thin React adapters. Do not add AppShell `useEffect` watchers for workflow events when a command can model the behavior.
- Use React 19 hooks deliberately in adapters/components (`useActionState`, `useOptimistic`, `useTransition`, `useEffectEvent`, `useSyncExternalStore`, `use`) when they simplify UI state, pending states, or subscriptions. Keep workflow rules in app-core.

## Implementation

- Read nearby code first and follow existing patterns.
- Keep changes scoped. Do not refactor unrelated code while fixing a feature.
- Before adding a dependency, check whether the repo already has a suitable library/component. New dependencies are OK when they solve the problem better.
- Do not hand-roll complex accessible widgets when an established component exists.
- Add small helpers/components when they improve testability or reuse.

## UI

- Use the existing design system and lucide icons.
- Build real workflows, not explanatory placeholder screens.
- Keep layouts responsive and keyboard accessible.
- Avoid overlapping text, clipped popovers, and fixed-height hacks.
- Verify meaningful frontend changes in Storybook or the app when practical.
- Prefer the real app for integrated workflow testing when a dev app is already running, usually `http://localhost:5173/`; use Storybook for isolated component states.

## Checks

- Do not use package `--filter` for checks. Run root checks because packages are coupled.
- Preferred checks:
  - `pnpm format:check`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- Use `pnpm format` for formatting.

## Tests

- Add tests close to changed code.
- Cover behavior, not only types.
- Avoid tests that only assert `satisfies`.
- Prefer role-based UI queries that match real user interaction.
- Unit tests are the default; do not suffix them with `.unit.test.*`.
- Use `.integration.test.*` rarely, only when real composition across units is the behavior under test.
