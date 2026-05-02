# Project Structure

## Recommendation

Use a **monorepo**. The codebase has clear boundaries (Electron main vs preload vs renderer, mock vs real repositories, Storybook vs production app, e2e vs unit) that benefit from being separately versioned, separately built, and separately testable. A monorepo also makes it cheap to add future surfaces (CLI, VS Code extension, docs site) without reshaping the repo.

## Tooling

- **Package manager**: `pnpm` workspaces. Faster installs, strict `node_modules`, first-class workspace protocol (`workspace:*`).
- **Task runner**: `turbo` (Turborepo) for cached `lint`, `typecheck`, `test`, `build` across packages.
- **TypeScript**: project references (`composite: true`) so `tsc -b` builds packages in dependency order and caches incrementally.
- **Lint/format/config**: shared via `packages/config-*` packages consumed by every workspace.
- **Formatting**: `dprint` (CI-enforced via `pnpm format:check`).

## Layout

```text
firebase-desk/
  .github/
    workflows/
      ci.yml
      e2e.yml
      release.yml

  docs/
  package.json              # workspace root, private, scripts delegate to turbo
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  apps/
    desktop/                # the shipped Electron app
      package.json
      electron.vite.config.ts
      src/
        main/
          app.ts
          windows/
          ipc/
          firebase/
          storage/
        preload/
          index.ts
          api.ts
        renderer/
          app/
          features/
            projects/
            firestore/
            js-query/
            auth/
            settings/
          components/
          styles/
    storybook/              # React/Vite component workbench for ui + product-ui
      .storybook/
      src/
  packages/
    design-tokens/          # theme/density tokens + generated CSS variables
      src/
    ui/                     # generic React primitives + virtualized data widgets
      src/
    product-ui/             # Firebase Desk shell, appearance, command palette, editor wrappers
      src/
    repo-contracts/         # repository interfaces + shared result types (no Firebase deps)
      src/
        projects/
        firestore/
        js-query/
        auth/
        settings/
    repo-mocks/             # in-memory mock implementations of repo-contracts
      src/
        fixtures/
    repo-firebase/          # real Admin-SDK-backed implementations (main-process only)
      src/
    data-format/            # Firestore <-> typed-JSON encode/decode (`__type__`)
      src/
    script-runner/          # isolated worker for user JS (logs/errors/return capture)
      src/
    ipc-schemas/            # Zod schemas + generated types for preload<->main IPC
      src/
    hotkeys/                # central keymap registry, default bindings, override hooks
      src/
    config-oxlint/          # shared oxlint preset
    config-dprint/          # shared dprint preset
    config-tsconfig/        # shared base tsconfigs (node, react, electron-main, electron-preload, electron-renderer)
    config-vitest/          # shared vitest preset
  e2e/                      # Playwright + Electron specs against emulator
    package.json
    fixtures/
    specs/
  firebase/
    emulator/               # firebase.json, firestore.rules, seed scripts
```

## Dependency Direction

```text
apps/desktop/renderer  ->  packages/design-tokens, product-ui, ui, repo-contracts, repo-mocks (dev), hotkeys, data-format, ipc-schemas (types)
apps/storybook         ->  packages/design-tokens, product-ui, ui, repo-mocks
apps/desktop/preload   ->  packages/ipc-schemas, repo-contracts (types)
apps/desktop/main      ->  packages/repo-contracts, repo-firebase, ipc-schemas, data-format, script-runner
e2e                    ->  apps/desktop (built artifact), packages/ipc-schemas (types)
packages/product-ui    ->  packages/design-tokens, ui, hotkeys, repo-contracts
packages/ui            ->  packages/design-tokens
packages/repo-firebase ->  packages/repo-contracts, data-format
packages/repo-mocks    ->  packages/repo-contracts, data-format
```

Hard rules:

- `apps/desktop/renderer` must not depend on `repo-firebase`, `script-runner`, or any Node/Electron-only package.
- `packages/repo-contracts` must have **zero runtime deps** (pure types + light helpers). It is the contract everything else negotiates against.
- Cross-package imports always use `workspace:*`; never deep-import another package's `src/`.

## Why This Shape

- Renderer is physically prevented from reaching Firebase code.
- Mocks and real repos satisfy the same contract package, so swapping implementations is a constructor change, not a refactor.
- Shared concerns (hotkeys, virtualization primitives, JSON tree, data encoding) live in packages from day one, so a second surface (CLI, web preview, docs site) can pick them up without extraction work.
- `e2e/` is a standalone workspace so its Playwright/Electron deps don't bleed into app installs.
- Per-package `tsconfig`/`oxlint`/`vitest` presets keep root config tiny and let new packages opt in by extending one file.

## Naming

- Feature names: `projects`, `firestore`, `js-query`, `auth`, `settings`.
- Package names: scoped, e.g. `@firebase-desk/repo-contracts`.
- Avoid Firefoo naming in code, docs, and UI.
- Working product name: `Firebase Desk` until final branding.

## Build Phases

1. Monorepo + CI foundation (pnpm workspaces, turbo, shared configs, GitHub Actions).
2. `repo-contracts` + `repo-mocks` + `ui` skeletons.
3. Electron shell in `apps/desktop` (main + preload + renderer) wired to mocks via IPC.
4. Mocked app contract hardening before real Firebase adapters.
5. Build/release pipeline: package macOS/Windows/Linux on PRs, publish unsigned `latest` and tagged GitHub Release assets with SHA-256 checksums, download/install smoke checks, document package-manager distribution as later work.
6. `repo-firebase` + project credential storage.
7. Firestore read/query APIs.
8. Firestore edit APIs.
9. `script-runner` package + JS Query feature.
10. Auth user APIs.

## Testing Layout

- Unit tests are colocated with source as `*.test.ts(x)` inside each package/app.
- Each package owns its own `vitest` config (extending `packages/config-vitest`).
- E2E tests live in `e2e/` because they exercise the packaged app + emulator together.
- Emulator config and seed fixtures live in `firebase/emulator/`.

## Root Scripts

Root `package.json` exposes thin wrappers; turbo fans out:

- `pnpm lint` -> `turbo run lint`
- `pnpm format` -> `dprint fmt`
- `pnpm format:check` -> `dprint check`
- `pnpm typecheck` -> `turbo run typecheck`
- `pnpm test` -> `turbo run test`
- `pnpm test:coverage` -> `turbo run test:coverage`
- `pnpm build` -> `turbo run build`
- `pnpm dev` -> `turbo run dev --parallel`
- `pnpm storybook` -> `pnpm --filter @firebase-desk/storybook dev`
- `pnpm test:e2e` -> `pnpm --filter @firebase-desk/e2e test`
- `pnpm package` -> `pnpm --filter @firebase-desk/desktop package`
