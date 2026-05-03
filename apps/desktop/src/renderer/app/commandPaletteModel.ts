import type { CommandPaletteItem } from '@firebase-desk/product-ui';
import type { WorkspaceTab, WorkspaceTabKind } from './stores/tabsStore.ts';

export interface CommandPaletteModelInput {
  readonly onChangeTheme: (mode: 'dark' | 'light') => void;
  readonly onFocusTreeFilter: () => void;
  readonly onOpenSettings: () => void;
  readonly onOpenTab: (kind: WorkspaceTabKind) => void;
  readonly onRunQuery: () => void;
  readonly onRunScript: () => void;
  readonly onSelectTab: (tabId: string) => void;
  readonly resolvedTheme: 'dark' | 'light';
  readonly tabs: ReadonlyArray<WorkspaceTab>;
}

export function createCommandPaletteModel(
  {
    onChangeTheme,
    onFocusTreeFilter,
    onOpenSettings,
    onOpenTab,
    onRunQuery,
    onRunScript,
    onSelectTab,
    resolvedTheme,
    tabs,
  }: CommandPaletteModelInput,
): ReadonlyArray<CommandPaletteItem> {
  return [
    ...tabs.map((tab) => ({
      id: `switch-${tab.id}`,
      label: `Switch to ${tab.title}`,
      onSelect: () => onSelectTab(tab.id),
    })),
    {
      id: 'new-firestore',
      label: 'New Firestore tab',
      onSelect: () => onOpenTab('firestore-query'),
    },
    { id: 'new-auth', label: 'New Auth tab', onSelect: () => onOpenTab('auth-users') },
    { id: 'new-js', label: 'New JS Query tab', onSelect: () => onOpenTab('js-query') },
    { id: 'settings', label: 'Settings', onSelect: onOpenSettings },
    {
      id: 'theme',
      label: 'Toggle theme',
      onSelect: () => onChangeTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
    },
    { id: 'focus-tree', label: 'Focus tree filter', onSelect: onFocusTreeFilter },
    { id: 'run-query', label: 'Run query', onSelect: onRunQuery },
    { id: 'run-script', label: 'Run script', onSelect: onRunScript },
  ];
}
