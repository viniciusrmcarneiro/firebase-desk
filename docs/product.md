# Product Spec

## Working Name

Firebase Desk.

## Goal

Create a free, open-source, desktop Firebase admin client for the workflows used most often: Firestore browsing/querying/editing, JavaScript admin scripts, and Authentication user lookup.

## Platform

Desktop-only MVP for macOS, Windows, and Linux.

## License

MIT.

## Target User

Developers and technical operators who already have Firebase project access and need a fast local admin tool without a subscription.

## Interaction Model

- The left side of the app is the main workspace tree.
- Each configured Firebase account/project appears as a root node.
- Each account root loads account-scoped tools only when expanded.
- Failed account tool loads show an inline error and Retry button.
- Account roots provide a remove action.
- Firestore expands into collections only; documents and subcollections are surfaced inside result views.
- Single-clicking a collection or JavaScript Query item focuses an existing matching tab when one exists, otherwise opens one.
- Double-clicking a collection or JavaScript Query item always opens a new tab.
- The opened tab is bound to the account/project that was clicked.
- Each tab has an account/project dropdown in its toolbar so that tab can switch account without changing other tabs.
- Multiple tabs can point at different accounts at the same time.
- Tabs can be rearranged with drag and drop.
- Tabs have a right-click menu for Close, Close Others, Close Tabs to Left, Close Tabs to Right, Sort by Account, and Close All.
- Switching the global tree selection must not silently change already-open tabs.
- Back and Forward controls navigate interaction history without creating duplicate tabs.
- If history targets a tab that was closed, replay does nothing for now.

## MVP Scope

### Project Access

- Add project from service account JSON.
- Add emulator connection profile.
- Store project metadata locally.
- Store credentials with OS-provided secure storage where possible.
- Load account tools lazily on account expansion.
- Show account-load retry on failure.
- Switch between projects.
- Switch between production and emulator targets clearly.
- Remove project from local app.

### Firestore Tree

- Show root collections.
- Do not list documents in the left tree.
- Refresh root collections for an account/project.
- Search/filter visible collections.
- Load collections lazily when the user expands Firestore for an account.

### Query Builder

- Query target input accepts a collection name or document path.
- Hide filters, sort, limit, and pagination when the target is not a collection name.
- Limit is a numeric input beside Run.
- Select collection or collection group mode.
- Add filters: field, operator, value.
- Add sort clauses: field, direction.
- Set limit.
- Paginate forward and backward.
- Reset query.
- Run query.

### Result Views

- Table view for scan/comparison.
- Tree view for nested document inspection.
- Tree view uses standard expand/collapse rows with indentation, not card/accordion styling.
- Tree view supports map fields, array fields, and nested subcollections at arbitrary depth.
- JSON result view is read-only typed JSON.
- Table row click selects without navigation.
- Table row double-click opens document JSON editor modal.
- Table and tree results append a Load more action as the final item when more documents are available.
- Result overview stays visible while switching table, tree, and JSON views.
- Result overview can collapse and moves below results when horizontal space is tight.
- Result overview shows a first-level field/type aggregation for loaded documents.
- Selection preview is an inspector accordion section shown only in table view.
- Subcollection indicators can open subcollections in new tabs.
- Result items support right-click Open in new tab for documents and subcollections.
- Empty state: "No data to show".
- Error state with Firebase/Admin SDK error details.

### Editing

- Open document detail.
- Edit document JSON fields only, without `id`, `path`, or `subcollections` metadata.
- Edit individual fields.
- Save document.
- Delete document.
- Confirm every destructive operation with an explicit modal click.
- Show save errors without losing local edit state.

### JavaScript Query

- Provide an editor where user scripts run against a connected Firebase Admin SDK context.
- Script receives app/admin helpers for the selected project.
- User can read, write, update, and delete data.
- `console.log` output appends to a Logs tab.
- Returned Firestore docs, doc arrays, query snapshots, or plain data are rendered in result views.
- Returned and yielded values append to a single result stream instead of replacing each other.
- Streamed result items are collapsed by default and scroll independently when expanded.
- Script editor and output panes stack when horizontal space is tight.
- Unsupported or empty returns show "No data to show".
- Show thrown errors in an Errors tab/panel.

### Authentication

- List users.
- Filter/search users.
- View selected user detail.
- View custom claims.
- Users table and user detail stack when horizontal space is tight.
- MVP may defer editing claims unless implementation is small.

### Responsive Shell

- Desktop app has a practical minimum size; below it, window scroll is acceptable.
- Left account tree can collapse on roomy widths and becomes a slide-out drawer on compact widths.
- Tab strip scrolls horizontally when many tabs are open.
- Tab toolbar wraps before controls overlap.
- Tables and result trees scroll inside their panels instead of stretching the whole workspace.
- Modals keep header/footer visible and scroll their body content.

### Emulator Support

- Connect Firestore and Authentication features to Firebase Emulator Suite.
- Store emulator host/port per local profile.
- Make emulator mode visually obvious in the app shell and status bar.
- Use emulator-backed flows for e2e tests.

## Non-Goals For MVP

- Realtime Database.
- Cloud Storage.
- Cloud Functions.
- Emulator suite management.
- Starting/stopping emulators from the app.
- Team sync/cloud accounts.
- Full offline cache.
- Role-based access control inside the app.

## Product Principles

- Native-feeling desktop app, not a marketing-style web dashboard.
- Fast access to project data.
- Clear read/write boundaries.
- Never hide risky mutations behind cute UI.
- Developer-first: scripts are powerful and trusted.
- UI code never talks to Firebase directly.
- Testability is product infrastructure, not cleanup work.
- Load Firebase data lazily, driven by user interaction, to avoid unnecessary reads and Firebase limits.
