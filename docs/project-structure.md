# Project Structure

## Recommendation

Start as one Electron app, not a monorepo. Split packages only after repeated shared code appears.

```text
firebase-explorer/
  .github/
    workflows/
  docs/
  src/
    main/
      app.ts
      windows/
      ipc/
      firebase/
      repositories/
      storage/
      script-runner/
    preload/
      index.ts
      api.ts
    renderer/
      app/
      features/
        projects/
          projects.repository.ts
          projects.repository.mock.ts
          projects.repository.test.ts
        firestore/
          firestore.repository.ts
          firestore.repository.mock.ts
          firestore.repository.test.ts
        js-query/
          js-query.repository.ts
          js-query.repository.mock.ts
          js-query.repository.test.ts
        auth/
          auth.repository.ts
          auth.repository.mock.ts
          auth.repository.test.ts
        settings/
      components/
      data/mock/
      styles/
    shared/
      types/
      schemas/
      constants/
  e2e/
    fixtures/
    specs/
  firebase/
    emulator/
```

## Why This Shape

- Easy to navigate during MVP.
- Clear Electron process boundaries.
- UI is isolated from Firebase through repository contracts.
- Feature folders match product areas.
- Unit tests live beside the code they cover.
- Shared types/schemas keep IPC typed.
- Mock data can power the live wireframe first, then be replaced feature by feature.
- E2E tests can own emulator fixtures separately from unit tests.

## Naming

- Use `firestore`, `auth`, `projects`, and `js-query` as feature names.
- Avoid Firefoo naming in code, docs, and UI.
- Keep `Firebase Explorer` as working product name until final branding.

## Build Phases

1. CI, test, build, emulator, and release workflow foundation.
2. Live wireframe with mock repositories.
3. Electron shell and native menus.
4. Project credential storage.
5. Firestore read/query APIs.
6. Firestore edit APIs.
7. JavaScript script runner.
8. Auth user APIs.
9. Packaging and release docs.

## Testing Layout

- Unit test files sit next to source files as `*.test.ts` or `*.test.tsx`.
- E2E tests live in `e2e/` because they test the packaged app behavior and emulator integration.
- Emulator fixtures live under `e2e/fixtures/` or `firebase/emulator/` depending on the tool requirement.
