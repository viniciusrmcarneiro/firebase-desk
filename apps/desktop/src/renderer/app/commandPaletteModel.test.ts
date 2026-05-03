import { describe, expect, it, vi } from 'vitest';
import { createCommandPaletteModel } from './commandPaletteModel.ts';
import type { WorkspaceTab } from './stores/tabsStore.ts';

describe('createCommandPaletteModel', () => {
  it('creates tab and workspace commands', () => {
    const onSelectTab = vi.fn();
    const onOpenTab = vi.fn();
    const onChangeTheme = vi.fn();
    const commands = createCommandPaletteModel({
      onChangeTheme,
      onFocusTreeFilter: vi.fn(),
      onOpenSettings: vi.fn(),
      onOpenTab,
      onRunQuery: vi.fn(),
      onRunScript: vi.fn(),
      onSelectTab,
      resolvedTheme: 'dark',
      tabs: [tab('tab-1', 'Orders')],
    });

    commands.find((command) => command.id === 'switch-tab-1')?.onSelect();
    commands.find((command) => command.id === 'new-firestore')?.onSelect();
    commands.find((command) => command.id === 'theme')?.onSelect();

    expect(onSelectTab).toHaveBeenCalledWith('tab-1');
    expect(onOpenTab).toHaveBeenCalledWith('firestore-query');
    expect(onChangeTheme).toHaveBeenCalledWith('light');
  });
});

function tab(id: string, title: string): WorkspaceTab {
  return {
    id,
    title,
    connectionId: 'emu',
    history: ['orders'],
    historyIndex: 0,
    inspectorWidth: 360,
    kind: 'firestore-query',
  };
}
