# Firebase Desk Design System Direction

## Purpose

Firebase Desk is an open-source Electron desktop app built with React and TypeScript. The UI should feel like a serious desktop developer tool, not a marketing website or generic SaaS dashboard.

The design system should be established early so future feature work uses consistent tokens, layout primitives, interaction patterns, and theme APIs.

## Product Feel

Firebase Desk should feel:

- Native enough for a desktop app.
- Dense enough for developer/admin workflows.
- Clear and safe around production data mutations.
- Keyboard-friendly.
- Fast, structured, and predictable.
- More like a developer tool than a consumer app.

Reference product category:

- VS Code
- TablePlus
- Postman
- MongoDB Compass
- JetBrains database tools
- Firefoo-style Firebase tooling

Do not make the app feel like:

- A marketing landing page.
- A roomy SaaS dashboard.
- A mobile-first web app.
- A playful consumer app.

## Recommended UI Stack

Use this stack unless there is a clear reason not to:

```txt
Radix UI primitives
Tailwind CSS
CSS variables for design tokens
class-variance-authority for variants
TanStack Table        (install when first needed; not yet a dep)
TanStack Virtual
Monaco Editor
react-resizable-panels
cmdk
lucide-react
```

### Why

Radix provides accessible unstyled primitives. Tailwind keeps styling fast. CSS variables make light/dark/future themes practical. CVA gives components a typed variant API. TanStack Table and Virtual are required for data-heavy Firebase surfaces. Monaco is the right editor base for JSON and JavaScript query workflows. `lucide-react` is the chosen icon library: open-source (ISC), tree-shakable, has a desktop-tool-friendly stroke style, and ships every icon Firebase Desk's known surfaces need (folders, branches, play, save, key, shield, terminal, search, settings).

### Bundle size

Not a concern at this phase. Heavy deps (Monaco, cmdk, lucide chunks) should be lazy-loaded at the point of use. A budget will be added only if real perf regressions appear.

## Monorepo Package Direction

Use a shallow package structure at first.

```txt
apps/
  desktop/

packages/
  design-tokens/
  ui/
  product-ui/
```

### `packages/design-tokens`

Contains theme tokens and exported constants.

Responsible for:

- Color primitives.
- Semantic color tokens.
- Spacing scale.
- Radius scale.
- Typography tokens.
- Z-index tokens.
- Density tokens.
- Theme definitions.

Should not contain React components.

### `packages/ui`

Generic reusable UI components.

Examples:

- Button
- Input
- Textarea
- Select
- Checkbox
- RadioGroup
- Switch
- Dialog
- AlertDialog
- DropdownMenu
- ContextMenu
- Tooltip
- Popover
- Tabs
- Badge
- Toast
- Separator
- ScrollArea
- EmptyState
- InlineAlert
- CodeBlock

These components should know nothing about Firebase.

### `packages/product-ui`

Firebase Desk-specific product components.

Examples:

- AppShell
- WorkspaceTree
- ProjectSwitcher
- TargetModeBadge
- ProductionWarning
- TabStrip
- TabToolbar
- SplitPaneLayout
- StatusBar
- FirestoreCollectionTree
- FirestoreResultTable
- FirestoreResultTree
- JsonTreeViewer
- DocumentEditorModal
- QueryBuilder
- AuthUsersTable
- ScriptRunnerPanel
- ScriptOutputConsole

These components may use Firebase Desk domain language, but should still receive data through props/contracts instead of importing Firebase code directly.

## Core Layout Model

The main app shell should follow this model:

```txt
AppShell
  Titlebar / native window area
  MainArea
    Sidebar / Project tree
    Workspace
      TabStrip
      TabToolbar
      ContentSplitPane
        MainPanel
        InspectorPanel
  StatusBar
```

### Desktop Layout Principles

- Prefer panels, split panes, trees, tabs, toolbars, and status bars.
- Avoid large card-heavy dashboard layouts for core data workflows.
- Use compact spacing by default.
- Keep data surfaces scrollable inside panels.
- Do not let tables or trees stretch the whole window vertically.
- Keep destructive or production-risk state visible.
- Preserve tab state when switching projects, views, or panels.

## Brand Palette

Initial colors should come from the Firebase Desk logo direction.

### Brand primitives

```ts
export const brandColors = {
  navy900: '#061A3D',
  navy800: '#0B2558',
  navy700: '#12346F',

  orange600: '#FF6A00',
  orange500: '#FF7A00',
  orange400: '#FF9A00',
  amber400: '#FFB21F',

  white: '#FFFFFF',
  slate950: '#020617',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
};
```

## Semantic Tokens

Components should use semantic tokens, not raw brand colors.

Use this token model:

```ts
export type ThemeTokens = {
  color: {
    bg: {
      app: string;
      panel: string;
      panelSubtle: string;
      elevated: string;
      overlay: string;
      inverse: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      disabled: string;
      inverse: string;
      brand: string;
      danger: string;
      warning: string;
      success: string;
    };
    border: {
      subtle: string;
      default: string;
      strong: string;
      focus: string;
      danger: string;
      warning: string;
    };
    action: {
      primary: string;
      primaryHover: string;
      primaryActive: string;
      secondary: string;
      secondaryHover: string;
      ghostHover: string;
      selected: string;
      selectedHover: string;
    };
    status: {
      productionBg: string;
      productionText: string;
      productionBorder: string;
      emulatorBg: string;
      emulatorText: string;
      emulatorBorder: string;
      successBg: string;
      successText: string;
      successBorder: string;
      warningBg: string;
      warningText: string;
      warningBorder: string;
      dangerBg: string;
      dangerText: string;
      dangerBorder: string;
    };
  };
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
  density: typeof density;
};
```

## Light Theme

```ts
export const lightTheme = {
  color: {
    bg: {
      app: '#F8FAFC',
      panel: '#FFFFFF',
      panelSubtle: '#F1F5F9',
      elevated: '#FFFFFF',
      overlay: 'rgba(15, 23, 42, 0.42)',
      inverse: '#0F172A',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      muted: '#64748B',
      disabled: '#94A3B8',
      inverse: '#FFFFFF',
      brand: '#0B2558',
      danger: '#991B1B',
      warning: '#92400E',
      success: '#166534',
    },
    border: {
      subtle: '#E2E8F0',
      default: '#CBD5E1',
      strong: '#94A3B8',
      focus: '#FF7A00',
      danger: '#FCA5A5',
      warning: '#FDE68A',
    },
    action: {
      primary: '#FF7A00',
      primaryHover: '#F06C00',
      primaryActive: '#D85F00',
      secondary: '#FFFFFF',
      secondaryHover: '#F1F5F9',
      ghostHover: '#F1F5F9',
      selected: '#FFF4E8',
      selectedHover: '#FFE7CC',
    },
    status: {
      productionBg: '#FEF2F2',
      productionText: '#991B1B',
      productionBorder: '#FCA5A5',
      emulatorBg: '#ECFDF5',
      emulatorText: '#166534',
      emulatorBorder: '#86EFAC',
      successBg: '#ECFDF5',
      successText: '#166534',
      successBorder: '#86EFAC',
      warningBg: '#FFFBEB',
      warningText: '#92400E',
      warningBorder: '#FDE68A',
      dangerBg: '#FEF2F2',
      dangerText: '#991B1B',
      dangerBorder: '#FCA5A5',
    },
  },
};
```

## Dark Theme

```ts
export const darkTheme = {
  color: {
    bg: {
      app: '#020617',
      panel: '#0F172A',
      panelSubtle: '#111C2F',
      elevated: '#172033',
      overlay: 'rgba(2, 6, 23, 0.72)',
      inverse: '#FFFFFF',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#94A3B8',
      disabled: '#64748B',
      inverse: '#0F172A',
      brand: '#FFB21F',
      danger: '#FCA5A5',
      warning: '#FDE68A',
      success: '#86EFAC',
    },
    border: {
      subtle: '#1E293B',
      default: '#334155',
      strong: '#475569',
      focus: '#FF9A00',
      danger: '#7F1D1D',
      warning: '#78350F',
    },
    action: {
      primary: '#FF7A00',
      primaryHover: '#FF8E1A',
      primaryActive: '#E06400',
      secondary: '#172033',
      secondaryHover: '#1E293B',
      ghostHover: '#1E293B',
      selected: 'rgba(255, 122, 0, 0.16)',
      selectedHover: 'rgba(255, 122, 0, 0.22)',
    },
    status: {
      productionBg: 'rgba(153, 27, 27, 0.22)',
      productionText: '#FCA5A5',
      productionBorder: '#7F1D1D',
      emulatorBg: 'rgba(22, 101, 52, 0.22)',
      emulatorText: '#86EFAC',
      emulatorBorder: '#166534',
      successBg: 'rgba(22, 101, 52, 0.22)',
      successText: '#86EFAC',
      successBorder: '#166534',
      warningBg: 'rgba(146, 64, 14, 0.22)',
      warningText: '#FDE68A',
      warningBorder: '#78350F',
      dangerBg: 'rgba(153, 27, 27, 0.22)',
      dangerText: '#FCA5A5',
      dangerBorder: '#7F1D1D',
    },
  },
};
```

## Theme Implementation

Use CSS variables as the runtime contract.

Example generated CSS:

```css
:root[data-theme="light"] {
  --color-bg-app: #f8fafc;
  --color-bg-panel: #ffffff;
  --color-bg-panel-subtle: #f1f5f9;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-border-subtle: #e2e8f0;
  --color-action-primary: #ff7a00;
}

:root[data-theme="dark"] {
  --color-bg-app: #020617;
  --color-bg-panel: #0f172a;
  --color-bg-panel-subtle: #111c2f;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-border-subtle: #1e293b;
  --color-action-primary: #ff7a00;
}
```

Tailwind should reference CSS variables instead of hard-coded values.

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--color-bg-app)',
          panel: 'var(--color-bg-panel)',
          subtle: 'var(--color-bg-panel-subtle)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        action: {
          primary: 'var(--color-action-primary)',
          primaryHover: 'var(--color-action-primary-hover)',
          selected: 'var(--color-action-selected)',
        },
      },
    },
  },
};
```

## Future Theme Support

Do not hard-code `light` and `dark` in component logic.

Use a theme registry:

```ts
export type ThemeName = 'light' | 'dark';

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} satisfies Record<ThemeName, ThemeTokens>;
```

Later, this can become:

```ts
export type ThemeName =
  | 'light'
  | 'dark'
  | 'midnight'
  | 'high-contrast'
  | 'solarized';
```

User theme settings should persist through `SettingsRepository`.

Suggested setting:

```ts
export type AppearanceMode = 'system' | 'light' | 'dark';
export type ThemeName = 'firebase-desk-default';

export type AppearanceSettings = {
  mode: AppearanceMode;
  theme: ThemeName;
};
```

Start with:

```ts
const defaultAppearanceSettings = {
  mode: 'system',
  theme: 'firebase-desk-default',
};
```

## Density System

Firebase Desk is a data-heavy admin tool. It should support compact UI by default.

```ts
export const density = {
  compact: {
    controlHeight: 28,
    rowHeight: 28,
    treeRowHeight: 28,
    tabHeight: 32,
    toolbarHeight: 36,
    panelPadding: 8,
    iconSize: 16,
  },
  comfortable: {
    controlHeight: 34,
    rowHeight: 36,
    treeRowHeight: 34,
    tabHeight: 38,
    toolbarHeight: 44,
    panelPadding: 12,
    iconSize: 18,
  },
};
```

Initial default:

```ts
const defaultDensity = 'compact';
```

Components must use density tokens for rows, trees, tabs, and controls.

## Typography

Use system fonts by default for native-ish desktop feel.

```ts
export const typography = {
  fontFamily: {
    sans: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`,
  },
  size: {
    xs: '0.75rem',
    sm: '0.8125rem',
    base: '0.875rem',
    md: '0.9375rem',
    lg: '1rem',
    xl: '1.125rem',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};
```

Default desktop UI text should generally be `13px` to `14px`.

Use monospace for:

- Document paths.
- Field paths.
- JSON values.
- Script editor.
- Logs.
- Error stack traces.

## Spacing

Use a compact spacing scale.

```ts
export const spacing = {
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
};
```

Avoid large marketing-style spacing in the app workspace.

## Radius

```ts
export const radius = {
  none: '0',
  xs: '0.125rem',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
};
```

Default control radius should be `md`.

Use larger radius only for empty states or landing-style surfaces, not dense data panels.

## Shadows

Use shadows sparingly. Desktop tools should rely more on borders and panel separation.

```ts
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
  md: '0 8px 24px rgba(15, 23, 42, 0.12)',
  popover: '0 12px 32px rgba(15, 23, 42, 0.18)',
  modal: '0 24px 64px rgba(15, 23, 42, 0.24)',
};
```

## Component Variant Rules

All generic components should expose small, consistent variant APIs.

Example Button API:

```ts
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'warning';

type ButtonSize = 'xs' | 'sm' | 'md';
```

Default button:

```txt
variant="secondary"
size="sm"
```

Use primary buttons sparingly.

Primary actions:

- Run Query
- Save Document
- Add Project
- Run Script

Danger actions:

- Delete Document
- Remove Project
- Clear Credentials
- Mutating script confirmation

## Production Safety UX

Firebase Desk can mutate production data. Safety states must be part of the design system.

Required components:

```txt
TargetModeBadge
ProductionWarning
DangerZone
ConfirmDestructiveDialog
MutatingScriptWarning
```

Production badge:

```txt
Target: Production
```

Emulator badge:

```txt
Target: Emulator
```

Rules:

- Production mode must always be visible in the shell/status bar.
- Destructive actions require explicit confirmation.
- Script runner mutations in production should show a clear warning.
- The app should never rely on color alone to communicate production/emulator mode.

## Accessibility Rules

All components must support:

- Keyboard navigation.
- Visible focus states (see Focus Ring Spec below).
- ARIA labels where text labels are absent.
- Escape-to-close for overlays.
- Correct dialog focus trapping.
- High enough color contrast in light and dark modes (target WCAG AA: 4.5:1 for body text, 3:1 for large text and non-text UI elements).
- No focus loss after menus/dialogs close.

Radix should be used for complex primitives to avoid rebuilding accessibility behavior.

## Focus Ring Spec

A single focus recipe is shared across every interactive component. It must be visible in both themes, work over arbitrary backgrounds, and never be removed by component-level CSS.

Tokens:

```css
:root {
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --focus-ring-color: var(--color-border-focus);
  --focus-ring-shadow:
    0 0 0 var(--focus-ring-offset) var(--color-bg-app),
    0 0 0 calc(var(--focus-ring-offset) + var(--focus-ring-width)) var(--focus-ring-color);
}
```

Global recipe:

```css
:where(button, a, [role="button"], [role="treeitem"], [role="tab"], [role="menuitem"], input, select, textarea):focus-visible {
  outline: none;
  box-shadow: var(--focus-ring-shadow);
  border-radius: var(--radius-md);
}
```

Rules:

- Use `:focus-visible`, never `:focus`. Mouse clicks do not show the ring.
- Components must not override `box-shadow` on `:focus-visible` without re-applying `--focus-ring-shadow`.
- For controls inside dense rows (table cells, tree rows), the offset may collapse to `0` but the ring color stays the same.
- For destructive controls in confirmation dialogs, swap `--focus-ring-color` to `var(--color-border-danger)` only inside that dialog's scope.

## Motion And Transitions

Desktop tools should feel responsive, not animated. Motion is restrained, mostly limited to state changes (hover, open/close, focus reveal). Tokens:

```ts
export const motion = {
  duration: {
    instant: '0ms',
    fast: '80ms',
    base: '140ms',
    slow: '220ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
};
```

CSS variables:

```css
:root {
  --motion-duration-fast: 80ms;
  --motion-duration-base: 140ms;
  --motion-duration-slow: 220ms;
  --motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --motion-easing-emphasized: cubic-bezier(0.3, 0, 0, 1);
  --motion-easing-exit: cubic-bezier(0.4, 0, 1, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-fast: 0ms;
    --motion-duration-base: 0ms;
    --motion-duration-slow: 0ms;
  }
}
```

Usage rules:

- Hover/active state changes use `fast`.
- Popover/menu/tooltip open uses `base`.
- Dialog enter uses `slow`; exit uses `fast` with `--motion-easing-exit`.
- No motion on data row mounts, virtualized scroll, or panel resize.
- Honor `prefers-reduced-motion` (handled by the media query above).

## Z-Index Scale

All stacking is centralized. Components must reference a token, not hard-code a number.

```ts
export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 100,
  appShell: 200,
  statusBar: 300,
  dropdown: 1000,
  popover: 1100,
  tooltip: 1200,
  overlay: 1300,
  dialog: 1400,
  toast: 1500,
  contextMenu: 1600,
};
```

CSS variables follow the same names (`--z-dropdown`, `--z-dialog`, etc.). Radix portals attach to `document.body` and consume these tokens via the component wrappers.

## Scrollbar Styling

Desktop scrollbars must be subtle and theme-aware. Native scrollbars are kept (no scrollbar-hijacking libraries) but visually tuned. The renderer-wide rules live alongside the global stylesheet that already enforces `overflow: hidden` on `html, body, #root` (so scrollbars only appear inside panels, not on the window).

```css
:root {
  --scrollbar-thumb: var(--color-border-default);
  --scrollbar-thumb-hover: var(--color-border-strong);
  --scrollbar-track: transparent;
  --scrollbar-size: 10px;
}

* {
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  scrollbar-width: thin;
}

*::-webkit-scrollbar {
  width: var(--scrollbar-size);
  height: var(--scrollbar-size);
}
*::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}
*::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: var(--radius-full);
  border: 2px solid var(--color-bg-panel);
}
*::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
*::-webkit-scrollbar-corner {
  background: transparent;
}
```

Rules:

- Scrollbars appear inside `Panel`, `ScrollArea`, virtualized lists/tables/trees, code editors, and result views — never on the window.
- Do not change scrollbar colors per-component; consume the tokens.
- For overlay surfaces (dropdown, popover, dialog), use `ScrollArea` (Radix) so scrollbars are inset and don't shift content.

## Radix Data-State Convention

Radix primitives expose state through `data-state` attributes (`open` / `closed` / `on` / `off` / `checked` / `unchecked` / `active` / `inactive` / `delayed-open` / `instant-open`). All `packages/ui` components built on Radix must:

- Style state visually through `data-state` selectors (Tailwind: `data-[state=open]:...`), never through internal React state mirroring.
- Expose the same `data-state` on the outer rendered element so consumers can target it.
- For disabled state use `data-disabled` (Radix sets it automatically); never combine `:disabled` and `data-state` in a single selector — prefer `data-disabled`.
- For controlled selection (`Tabs`, `ToggleGroup`, `RadioGroup`), style the active item with `data-state="active"` and the focus ring spec above.
- CVA variants must be additive: variant classes set base color/size, `data-state` selectors layer interaction visuals on top.

Example (Button-like trigger):

```tsx
<Trigger
  className={cn(
    'rounded-md px-3 h-7 text-sm',
    'data-[state=open]:bg-action-secondaryHover',
    'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
  )}
/>;
```

## Keyboard and Desktop Behavior

The app should be keyboard-first. Shortcuts are owned by the existing `@firebase-desk/hotkeys` package, which wraps `@tanstack/react-hotkeys`, exposes a central registry, and applies user overrides loaded through `SettingsRepository`. The design system does not introduce a parallel registry — product-ui surfaces register their bindings against `@firebase-desk/hotkeys`.

Default shortcuts:

```txt
Cmd/Ctrl+B      Toggle sidebar
Cmd/Ctrl+\      Toggle inspector/result overview
Cmd/Ctrl+K      Focus tree filter / command search
Cmd/Ctrl+T      New tab
Cmd/Ctrl+W      Close active tab
Cmd/Ctrl+1..9   Switch tabs
Alt+Left        Back
Alt+Right       Forward
Cmd/Ctrl+,      Settings
?               Shortcut help
Esc             Close modal/menu/drawer
Cmd/Ctrl+Enter  Run query or script
/               Focus search in current table/auth view
```

Rules:

- Shortcuts should not fire while typing unless explicitly intended (handled by the `editable.ts` helper in `@firebase-desk/hotkeys`).
- Cmd/Ctrl+Enter may run from editors.
- Esc should close the top-most overlay first.
- All shortcuts must be registered in `@firebase-desk/hotkeys`; no ad-hoc `addEventListener('keydown')`.

## Core Generic Components To Build First

Build these before feature UI grows:

```txt
Button
IconButton
Input
SearchInput
Textarea
Select
Checkbox
Switch
Badge
Tooltip
DropdownMenu
ContextMenu
Dialog
AlertDialog
Tabs
SegmentedControl
Toolbar
Panel
PanelHeader
PanelBody
ResizablePanelGroup wrapper
ScrollArea
EmptyState
InlineAlert
StatusBadge
Spinner
Skeleton
```

## Product Components To Build First

```txt
AppShell
SidebarShell
WorkspaceShell
TabStrip
StatusBar
TargetModeBadge
ProductionWarning
ProjectTree placeholder
QueryTab placeholder
AuthTab placeholder
ScriptTab placeholder
SettingsDialog
```

Do not wait until Firebase integration exists to build the shell. Use mock repositories and placeholder data.

## Data Surface Rules

For all large lists/tables/trees:

- Use virtualization from day one.
- Do not render unbounded `.map()` lists.
- Row heights should be predictable where possible.
- Pagination/load-more must work with virtualization.
- Selection state must not require navigation.
- Right-click context menus should work on rows and tree items.

Required libraries:

```txt
@tanstack/react-table
@tanstack/react-virtual
```

## Dark Mode Rules

Dark mode must not be an afterthought.

Rules:

- All colors must come from tokens.
- No component should hard-code light-only colors.
- Shadows should be reduced or replaced with borders in dark mode.
- Inputs, popovers, dialogs, tabs, and menus must be tested in both themes.
- Monaco editor must switch theme with app appearance.
- Syntax colors should be selected separately from UI colors.

## File Naming Conventions

Suggested structure:

```txt
packages/ui/src/button/Button.tsx
packages/ui/src/button/Button.styles.ts
packages/ui/src/button/index.ts

packages/product-ui/src/app-shell/AppShell.tsx
packages/product-ui/src/app-shell/AppShell.parts.tsx
packages/product-ui/src/app-shell/index.ts
```

Use kebab-case folders and PascalCase components.

## Import Boundary Rules

Renderer code may import:

```txt
@firebase-desk/design-tokens
@firebase-desk/ui
@firebase-desk/product-ui
@firebase-desk/repo-contracts
@firebase-desk/repo-mocks       (until real repos exist)
@firebase-desk/hotkeys
@firebase-desk/ipc-schemas
```

Renderer code must not import:

```txt
@firebase-desk/repo-firebase
@firebase-desk/script-runner
firebase-admin
node:fs
node:path
node:child_process
electron (main process modules)
service account loaders
main-process repositories
```

These rules are enforced by `packages/config-oxlint/oxlintrc.renderer.json` (`no-restricted-imports`). The design system reinforces them by keeping all UI packages pure React/browser-safe code.

## Deferred Decisions

- Visual regression tooling is deferred until the component set stabilizes in Storybook.
- Hotkey rebinding UI is deferred; the registry and settings override contract exist now.
- Bundle budgets can be added when release artifacts need a hard size target.
