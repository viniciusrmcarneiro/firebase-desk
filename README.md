# Firebase Explorer

A free, open-source desktop Firebase admin client for developers: browse, query, and edit Firestore data, inspect Authentication users, connect to emulators, and run JavaScript admin scripts locally.

Status: planning. First implementation target is CI-tested project foundation, then a live wireframe app focused on the account tree, tab model, and core view layout before connecting Firebase.

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
- GitHub Actions from the first scaffold: lint, typecheck, unit tests, build, emulator e2e, and release packaging checks.
- MIT license.

## Docs

- [wireframes/src/index.html](wireframes/src/index.html)
- [wireframes/README.md](wireframes/README.md)
- [docs/product.md](docs/product.md)
- [docs/live-wireframe.md](docs/live-wireframe.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/data-format.md](docs/data-format.md)
- [docs/project-structure.md](docs/project-structure.md)
- [docs/testing-ci.md](docs/testing-ci.md)
- [docs/tasks.md](docs/tasks.md)
