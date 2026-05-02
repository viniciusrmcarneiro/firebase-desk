/**
 * Central registry of every hotkey id + default binding.
 * Keys are stable ids; user overrides reference these ids via SettingsRepository.
 */
export interface HotkeyDefinition {
  readonly id: string;
  readonly description: string;
  readonly defaultBinding: string;
  readonly scope: 'global' | 'query-tab' | 'js-query-tab' | 'auth-tab';
  /** Allow firing while focus is in an editable input. */
  readonly allowInEditable?: boolean;
}

export const HOTKEYS = {
  'sidebar.toggle': {
    id: 'sidebar.toggle',
    description: 'Toggle sidebar',
    defaultBinding: 'mod+b',
    scope: 'global',
  },
  'overview.toggle': {
    id: 'overview.toggle',
    description: 'Toggle result overview',
    defaultBinding: 'mod+\\',
    scope: 'global',
  },
  'tree.focusFilter': {
    id: 'tree.focusFilter',
    description: 'Focus tree filter',
    defaultBinding: '/',
    scope: 'global',
  },
  'commandPalette.open': {
    id: 'commandPalette.open',
    description: 'Open command palette',
    defaultBinding: 'mod+k',
    scope: 'global',
  },
  'tab.new': {
    id: 'tab.new',
    description: 'New tab (duplicate active type)',
    defaultBinding: 'mod+t',
    scope: 'global',
  },
  'tab.close': {
    id: 'tab.close',
    description: 'Close active tab',
    defaultBinding: 'mod+w',
    scope: 'global',
  },
  'history.back': {
    id: 'history.back',
    description: 'History back',
    defaultBinding: 'alt+left',
    scope: 'global',
  },
  'history.forward': {
    id: 'history.forward',
    description: 'History forward',
    defaultBinding: 'alt+right',
    scope: 'global',
  },
  'settings.open': {
    id: 'settings.open',
    description: 'Open settings',
    defaultBinding: 'mod+,',
    scope: 'global',
  },
  'help.show': {
    id: 'help.show',
    description: 'Show shortcut help',
    defaultBinding: '?',
    scope: 'global',
  },
  'modal.dismiss': {
    id: 'modal.dismiss',
    description: 'Close modal/menu/drawer',
    defaultBinding: 'escape',
    scope: 'global',
    allowInEditable: true,
  },
  'query.focusPath': {
    id: 'query.focusPath',
    description: 'Focus query path',
    defaultBinding: 'mod+l',
    scope: 'query-tab',
  },
  'query.run': {
    id: 'query.run',
    description: 'Run query',
    defaultBinding: 'mod+enter',
    scope: 'query-tab',
    allowInEditable: true,
  },
  'jsQuery.run': {
    id: 'jsQuery.run',
    description: 'Run script',
    defaultBinding: 'mod+enter',
    scope: 'js-query-tab',
    allowInEditable: true,
  },
  'auth.focusSearch': {
    id: 'auth.focusSearch',
    description: 'Focus user search',
    defaultBinding: '/',
    scope: 'auth-tab',
  },
} as const satisfies Record<string, HotkeyDefinition>;

const HOTKEYS_INDEX: Record<string, HotkeyDefinition> = HOTKEYS;

export type HotkeyId = keyof typeof HOTKEYS;

export function getDefinition(id: HotkeyId): HotkeyDefinition {
  return HOTKEYS_INDEX[id]!;
}

export function getDefaultBinding(id: HotkeyId): string {
  return getDefinition(id).defaultBinding;
}

/** Resolve the active binding for an id given a user-overrides map. */
export function resolveBinding(id: HotkeyId, overrides: Readonly<Record<string, string>>): string {
  return overrides[id] ?? getDefinition(id).defaultBinding;
}
