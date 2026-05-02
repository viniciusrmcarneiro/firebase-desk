import { useMemo } from 'react';
import {
  type CommandPaletteModelInput,
  createCommandPaletteModel,
} from '../commandPaletteModel.ts';
import type { WorkspaceTabKind } from '../stores/tabsStore.ts';
import { useAppShellHotkeys } from './useAppShellHotkeys.ts';

interface UseAppCommandPaletteControllerInput extends CommandPaletteModelInput {
  readonly activeTabKind: WorkspaceTabKind | null;
  readonly onBack: () => void;
  readonly onCloseTab: () => void;
  readonly onForward: () => void;
  readonly onNewTab: () => void;
}

export function useAppCommandPaletteController(
  {
    activeTabKind,
    onBack,
    onChangeTheme,
    onCloseTab,
    onFocusTreeFilter,
    onForward,
    onNewTab,
    onOpenSettings,
    onOpenTab,
    onRunQuery,
    onRunScript,
    onSelectTab,
    resolvedTheme,
    tabs,
  }: UseAppCommandPaletteControllerInput,
) {
  useAppShellHotkeys({
    activeTabKind,
    onBack,
    onCloseTab,
    onFocusSearch: onFocusTreeFilter,
    onForward,
    onNewTab,
    onOpenSettings,
    onRunQuery,
    onRunScript,
  });

  return useMemo(
    () =>
      createCommandPaletteModel({
        onChangeTheme,
        onFocusTreeFilter,
        onOpenSettings,
        onOpenTab,
        onRunQuery,
        onRunScript,
        onSelectTab,
        resolvedTheme,
        tabs,
      }),
    [
      onChangeTheme,
      onFocusTreeFilter,
      onOpenSettings,
      onOpenTab,
      onRunQuery,
      onRunScript,
      onSelectTab,
      resolvedTheme,
      tabs,
    ],
  );
}
