# Firebase Desk

A free, open-source desktop Firebase admin client for developers: browse, query, and edit Firestore data, inspect Authentication users, connect to emulators, and run JavaScript admin scripts locally.

Status: active desktop app with mock mode, local emulator support, and production Firebase project support.

Safety note: binaries are published as unsigned development builds with SHA-256 checksums. Expect OS warning prompts. Production Firebase writes are enabled, so use production credentials carefully.

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
- **pnpm + Turborepo monorepo** (`apps/desktop`, `apps/storybook`, `packages/*`, `e2e/`). See [docs/project-structure.md](docs/project-structure.md).
- GitHub Actions from the first scaffold: lint, typecheck, unit tests, build, emulator e2e, and release packaging checks.
- MIT license.

## Docs

- [docs/product.md](docs/product.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/app-core-pattern.md](docs/app-core-pattern.md)
- [docs/data-format.md](docs/data-format.md)
- [docs/design-system.md](docs/design-system.md)
- [docs/project-structure.md](docs/project-structure.md)
- [docs/release-checklist.md](docs/release-checklist.md)
- [docs/package-managers.md](docs/package-managers.md)
- [docs/testing-ci.md](docs/testing-ci.md)

## Local Scripts ↔ GitHub Actions

Every workflow has an identical local pnpm command:

| Workflow      | Local equivalent                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `ci.yml`      | `pnpm install && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build` |
| `e2e.yml`     | `pnpm install && pnpm build && pnpm test:smoke`                                                        |
| `release.yml` | `pnpm install && pnpm package` (per-OS)                                                                |

Linux package smoke can be reproduced from macOS with Docker:

```sh
pnpm package:linux:docker
```

The Docker wrapper runs the Ubuntu image as `linux/amd64` and grants the Chromium sandbox capability needed by packaged Electron apps.

## Release Workflow

Firebase Desk publishes unsigned binaries with SHA-256 checksums. We do not plan to sign binaries; package-manager distribution starts with self-owned Homebrew and Scoop manifests.

| Event           | Output                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| PR to `main`    | CI, package Linux; package macOS/Windows when `package-all` or package paths change; upload temporary workflow artifacts                    |
| Merge to `main` | CI, package macOS/Windows/Linux, create `vX.Y.Z`, publish a stable release, and update prerelease `latest` when the desktop version changed |
| Tag `v*.*.*`    | CI, package macOS/Windows/Linux, publish or repair a stable versioned release                                                               |
| Manual dispatch | Ad-hoc package smoke run with temporary workflow artifacts                                                                                  |

Use PR artifacts to block broken packaging before merge. Use GitHub Release assets from version tags as stable download links. The rolling `latest` tag is created once and kept stable; the release assets and notes mirror the newest versioned `main` release only when the desktop package version changes.

Pull requests to `main` must change `apps/desktop/package.json` version unless the title includes `[skip release]`. Version tags must match the desktop package version, for example `v0.1.0` requires `apps/desktop/package.json` version `0.1.0`.

## Downloads

- Rolling dev build: <https://github.com/viniciusrmcarneiro/firebase-desk/releases/tag/latest>
- Versioned releases: <https://github.com/viniciusrmcarneiro/firebase-desk/releases>

Artifact names include channel/version, OS, architecture, and target extension. PR and manual-dispatch artifacts are temporary workflow artifacts, not release assets. Each package artifact set includes a matching `SHA256SUMS*.txt` file.

Versioned releases also include `release-manifest.json`. Version release workflows generate Homebrew cask and Scoop manifests as workflow artifacts for self-owned package manager distribution.

## Checksums

Release assets include matching `SHA256SUMS*.txt` files. Verify downloads before opening them:

```sh
shasum -a 256 -c SHA256SUMS*.txt
```

Run that command in the directory containing the downloaded binary and matching checksum file.

## Unsigned App Warnings

- macOS: Gatekeeper may block the app. For local smoke testing, remove quarantine with `xattr -dr com.apple.quarantine "Firebase Desk.app"`, then open from Finder.
- Windows: SmartScreen may warn on the installer or zip app. For local smoke testing, use `More info > Run anyway`.
- Linux: AppImage builds may need `chmod +x Firebase\ Desk-*.AppImage`; `.deb` builds can be installed with `sudo apt install ./Firebase\ Desk-*.deb`.

Signing, notarization, and Windows code-signing are intentionally out of scope. Package managers provide checksums and update paths, not signing. See [docs/release-checklist.md](docs/release-checklist.md).
