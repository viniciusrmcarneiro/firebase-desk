# E2E Smoke Tests

Smoke tests run the desktop app in live mode against local Firebase emulators.

## Command

```sh
pnpm --dir e2e test:withEmulators
```

## Rules

- Launch app smoke tests with `--data-mode=live`.
- Do not add mock-mode smoke specs.
- Drive app behavior through visible UI actions.
- Use emulator REST/Admin only for setup and persisted-state verification.
- Do not call app IPC/preload APIs from smoke specs.
- Keep shared helpers in `e2e/fixtures`.
- Keep smoke workers at `1`; specs share emulator state.

## Notes

- Firestore smoke verifies persisted data by reading the Firestore emulator REST API.
- Auth smoke verifies custom claims through Auth emulator REST lookup.
- Monaco JSON helpers set the active editor model directly because Electron keyboard select-all is not reliable in the Monaco textarea. The app action still happens through the modal buttons.
