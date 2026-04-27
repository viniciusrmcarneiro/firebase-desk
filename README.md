# Firebase Desk

A free, open-source desktop Firebase admin client for developers: browse, query, and edit Firestore data, inspect Authentication users, connect to emulators, and run JavaScript admin scripts locally.

Status: mocked app. Current priority is release packaging so GitHub can produce downloadable desktop binaries before real Firebase integration continues.

Safety note: early binaries are published as unsigned development builds. Expect OS warning prompts, and do not use production Firebase credentials yet; real Firebase integration is not enabled.

## MVP

- Manage multiple Firebase projects from service account JSON files.
- Browse Firestore collections as a tree.
- Query collections with filters, sorting, limits, and pagination.
- View query results as a JSON tree or table.
- Edit documents as full JSON or individual fields.
- Run custom JavaScript against an initialized Firebase Admin SDK context.
- Browse Firebase Authentication users, filter users, inspect details, and view custom claims.
- Connect to real Firebase projects or local Firebase emulators.

## Tech Direction

- Electron desktop app.
- React + TypeScript renderer.
- Repository layer between UI and Firebase code.
- Firebase Admin SDK in the Electron main process or an isolated worker process.
- Native-feeling UI using system fonts, native menus, OS shortcuts, and keychain-backed local storage.
- **pnpm + Turborepo monorepo** from day one (`apps/desktop`, `apps/wireframe`, `packages/*`, `e2e/`). See [docs/project-structure.md](docs/project-structure.md).
- GitHub Actions from the first scaffold: lint, typecheck, unit tests, build, emulator e2e, and release packaging checks.
- MIT license.

## Docs

- [apps/wireframe/src/index.html](apps/wireframe/src/index.html)
- [apps/wireframe/README.md](apps/wireframe/README.md)
- [docs/product.md](docs/product.md)
- [docs/live-wireframe.md](docs/live-wireframe.md)
- [docs/design-system.md](docs/design-system.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/data-format.md](docs/data-format.md)
- [docs/project-structure.md](docs/project-structure.md)
- [docs/testing-ci.md](docs/testing-ci.md)
- [docs/tasks.md](docs/tasks.md)

## Local Scripts ↔ GitHub Actions

Every workflow has an identical local pnpm command:

| Workflow      | Local equivalent                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `ci.yml`      | `pnpm install && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build` |
| `e2e.yml`     | `pnpm install && pnpm build && pnpm --filter @firebase-desk/e2e test:withEmulators`                    |
| `release.yml` | `pnpm install && pnpm package` (per-OS)                                                                |

## Release Workflow

Early binaries are unsigned development builds. Signing is not required to publish them; it only removes OS trust warnings later.

| Event           | Output                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PR to `main`    | CI, package Linux; package macOS/Windows when `package-all` or package paths change; upload temporary workflow artifacts |
| Merge to `main` | CI, package macOS/Windows/Linux, publish/update prerelease `main-latest`                                                 |
| Tag `v*.*.*`    | CI, package macOS/Windows/Linux, publish versioned prerelease                                                            |
| Manual dispatch | Ad-hoc package smoke run with temporary workflow artifacts                                                               |

Use PR artifacts to block broken packaging before merge. Use GitHub Release assets from `main-latest` and version tags as the long-lived download links.

## Downloads

- Rolling dev build: <https://github.com/viniciusrmcarneiro/firebase-desk/releases/tag/main-latest>
- Versioned prereleases: <https://github.com/viniciusrmcarneiro/firebase-desk/releases>

Artifact names include channel/version, OS, architecture, and target extension. PR and manual-dispatch artifacts are temporary workflow artifacts, not release assets.

## Unsigned App Warnings

- macOS: Gatekeeper may block the app. For local smoke testing, remove quarantine with `xattr -dr com.apple.quarantine "Firebase Desk.app"`, then open from Finder.
- Windows: SmartScreen may warn on the installer or zip app. For local smoke testing, use `More info > Run anyway`.
- Linux: AppImage builds may need `chmod +x Firebase\ Desk-*.AppImage`; `.deb` builds can be installed with `sudo apt install ./Firebase\ Desk-*.deb`.

Signing, notarization, and Windows code-signing are deferred while unsigned development binaries are published. See [docs/release-checklist.md](docs/release-checklist.md).
