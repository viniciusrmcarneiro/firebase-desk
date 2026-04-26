# Live Wireframe Plan

## Purpose

Build a runnable desktop prototype to validate the look, feel, navigation, tab model, and view coverage before Firebase integration. This phase is for shape and direction, not realistic data behavior.

The first artifact is a browser-runnable source file: [wireframes/src/index.html](../wireframes/src/index.html).

Open it directly from `file://`. No build step is required for the current prototype.

## Prototype Rules

- Use simple fake Firebase accounts, collections, docs, query results, logs, and auth users.
- Fake data must be served through mock repository implementations.
- No real service account parsing yet.
- No Firebase Admin SDK connection yet.
- Keep `wireframes/src/index.html` directly runnable in the browser.
- Prefer native HTML `<template>` blocks for repeated wireframe markup over large inline HTML strings in JavaScript.
- UI code must already use repository contracts, so Firebase integration can replace mocks without rewriting views.
- Navigation, tab opening, tab switching, and account dropdowns should work.
- Saves/deletes can be visual-only placeholders.
- UI should use dense, native-feeling desktop patterns.
- UI should look polished, modern, and support light/dark themes.
- UI must stay usable when the desktop window is resized; set a practical minimum size, then use collapsible/drawer sidebars, stacked panes, and contained scroll areas.
- Custom themes are allowed later, but not required for the first wireframe.
- Firebase data is lazy-loaded only from user interaction. Only locally stored project metadata is available eagerly.
- The app has top-left Back and Forward controls for navigation history.
- Detailed feature tasks and per-page/per-tab specs come after this wireframe is reviewed.

## Core Navigation Model

- Left side is an account tree, not only a project selector.
- Account/project nodes are top-level tree roots.
- Account tools load only after the account is expanded.
- Failed account tool loads show an inline error and Retry button.
- Each loaded account has child nodes for Firestore, Authentication, and JavaScript Query.
- Accounts can be removed from the tree.
- Firestore starts collapsed for each account.
- Clicking Firestore lazy-loads collection names for that account only.
- Firestore expands into collections only; documents appear in query results.
- Single-clicking a collection focuses an existing matching query tab, or opens one if none exists.
- Double-clicking a collection always opens a new query tab and does not add history.
- Documents should not appear in the left tree because collections can contain many documents.
- Subcollections are surfaced from document rows/tree results and always open in a new tab.
- Clicking Authentication opens an Auth users tab for that account.
- Single-clicking JavaScript Query focuses an existing matching script tab, or opens one if none exists.
- Double-clicking JavaScript Query always opens a new script tab and does not add history.
- Clicking non-query tool items may focus an existing account-bound tab when practical.

## Navigation History

- Back and Forward sit at the top-left of the app.
- Every user interaction except double-clicks is added to navigation history.
- History entries that opened tabs focus the tab created by the original action.
- History must not create duplicate tabs while replaying.
- If the target tab was closed, history replay does nothing for now.

## Tab Model

- Right side is a tabbed workspace.
- Every tab is bound to one account/project.
- Every tab toolbar includes an account/project dropdown.
- Changing the dropdown affects only that tab.
- Tabs can show the same collection, document, Auth table, or script editor against different accounts.
- Tab title should include enough context to identify view and account.
- Tab content should show a small target indicator: mock, emulator, or production.
- Tabs can be rearranged with drag and drop.
- Tab right-click menu supports Close, Close Others, Close Tabs to Left, Close Tabs to Right, Sort by Account, and Close All.
- Closing a tab should not affect tree state or other tabs.

## App Shell

- Native desktop window frame.
- App menu.
- Left account tree with a collapse control on roomy widths and a slide-out drawer on compact widths.
- When the desktop sidebar is collapsed it becomes a 48px rail with section icons; clicking any rail icon expands the sidebar and selects the corresponding account/section. Expanded sidebar exposes a single collapse chevron.
- Sidebar and result-overview widths are user-resizable via splitters; widths persist via settings (sidebar) and per-tab state (inspector).
- Result overview collapse renders as a vertical strip with an always-visible expand button; on stacked (narrow content) layouts the strip is horizontal.
- Global keyboard shortcuts ship from the wireframe (`?` opens a help overlay listing them).
- Right tabbed workspace.
- Active tab toolbar with account/project dropdown.
- Status bar showing selected tree item, active tab account, environment, and last action.
- Environment indicator for production vs emulator vs mock.
- The shell has a minimum usable desktop size; below that, browser/window scroll is allowed instead of compressing controls until they break.
- Tabs and toolbars horizontally scroll or wrap before content overlaps.

## Primary Views

### Projects

- Account/project root list in the tree.
- Add project action.
- Service account JSON drop/select placeholder.
- Project detail summary.
- Remove project action.

### Firestore

- Collection tree under each account root.
- Refresh action on Firestore tree item reloads collections only.
- Query path input accepts a collection name or document path.
- Query path input keeps focus while typing until Run/Enter applies the path.
- Limit is a numeric input beside Run.
- Filter/sort/limit controls show only for collection-name queries.
- Query builder panel.
- Results panel with table, tree, and JSON tabs.
- Table row click selects only; it must not navigate away.
- Table row double-click opens a document edit modal.
- Table and tree result views append a Load more action as the final item when more documents are available.
- Result overview remains visible across table, tree, and JSON results.
- Result overview can collapse; query/results and overview stack when there is not enough horizontal space.
- Result overview has a collapsible first-level fields/types aggregation for loaded documents.
- If a field appears with multiple types, the types are listed together.
- Selection preview remains a table-only section for the selected document.
- Subcollection indicator opens the subcollection in a new tab.
- Result items support a right-click menu with Open in new tab.
- Tree result view uses standard expand/collapse rows and indentation.
- Tree result view supports nested maps, arrays, and subcollections at arbitrary depth.
- JSON result view is read-only JSON text using `__type__` objects for Firestore-specific values.
- Document edit modal edits only document fields, not `id`, `path`, or `subcollections`.
- Edit JSON mode.
- Edit field mode.
- Destructive actions require a confirmation modal click.

### JavaScript Query

- Account-bound script tab.
- Script editor.
- Run button.
- Streamed result view that appends each yielded or returned document, collection, or query result.
- Streamed result items are collapsed by default and open like accordions.
- Script output scrolls independently when result items are expanded.
- Editor and output panes stack on narrow widths and keep independent scrolling.
- Result table/tree/JSON tabs where applicable.
- Logs tab.
- Errors tab.
- Execution status and duration.

### Authentication

- Account-bound Auth tab.
- Users table.
- Filter/search controls.
- User detail panel.
- Claims JSON viewer.

### Settings

- Theme follows system.
- Credential storage info.
- Data safety warning.
- Version/license info.

## Component Inventory

- AppShell
- AccountTree
- AccountTreeNode
- WorkspaceTabs
- WorkspaceTab
- TabToolbar
- TabAccountDropdown
- ProjectList
- ProjectAddDialog
- FirestoreTree
- QueryBuilder
- FilterRow
- SortRow
- PaginationControls
- ResultViewToggle
- ResultTable
- JsonTree
- DocumentDetailPanel
- JsonEditor
- FieldEditor
- ScriptEditor
- ScriptRunToolbar
- LogPanel
- ErrorPanel
- AuthUsersTable
- AuthUserDetail
- ClaimsViewer
- ConfirmDialog
- Toast/Notification
- StatusBar

## Acceptance Criteria

- User can navigate every MVP area from the app shell.
- Left tree shows multiple account roots.
- Account roots load Firestore, Authentication, and JavaScript Query only after expansion.
- Account load errors show Retry instead of empty children.
- Account rows include a remove action.
- Firestore tree expands into account collections only.
- Firestore tree shows collections, not document rows.
- Firestore nodes start collapsed and lazy-load collections on click.
- Firestore tree has a refresh action for collections.
- Collection single-click focuses existing tabs; double-click opens new tabs.
- Query tab has a path input for collection name or document path.
- Query path input keeps focus while the user edits it.
- Query tab has a numeric limit input beside Run for collection queries.
- Query controls hide when the path is not a collection name.
- Clicking tree items opens account-bound tabs on the right.
- Each tab has an account/project dropdown that changes only that tab.
- Same view can be open for different accounts at the same time.
- Views use mock repositories, not hard-coded component data.
- Query builder can add/remove filters and sorts.
- Results switch between table, tree, and JSON.
- Table and tree results show Load more as the final item when the result has more mock documents.
- Table row click selects the row without navigating.
- Table row double-click opens a JSON edit modal.
- Tree result uses standard expand/collapse icons and indentation.
- Tree result supports nested subcollections at arbitrary depth.
- Mock data includes array fields and map fields.
- Rows/tree results indicate subcollections and always open them in new tabs.
- Result items support right-click Open in new tab.
- Result overview stays visible when switching result views.
- Fields/types section aggregates first-level fields from the whole result set; selection preview appears only in table view.
- Result JSON is read-only.
- JSON editing shows only document fields and preserves Firestore-specific values using `__type__` metadata.
- Destructive operations require confirmation in a modal dialog.
- JavaScript view can simulate logs, collapsed streamed returned/yielded data, empty return, and thrown error.
- Auth view can filter mock users and open user details.
- App looks usable on macOS, Windows, and Linux dimensions.
- App shell, tabs, query views, document editor, JavaScript Query, Authentication, Settings, modals, context menus, status bar, tables, and tree results remain usable across wide, medium, and compact desktop sizes.
- Tables and tree grids use horizontal scrolling inside their panel instead of forcing the full window wider.

## Wireframe Review Output

After the live wireframe feels right, create detailed specs and tasks for:

- App shell and account tree.
- Workspace tabs and tab account switching.
- Firestore query tab.
- Firestore document tab.
- JavaScript Query tab.
- Authentication users tab.
- Project/account management.
- Settings.
