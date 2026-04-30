import type { AppearanceMode } from '@firebase-desk/design-tokens';
import type { SettingsPatch } from '@firebase-desk/repo-contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  changeAppearanceModeCommand,
  type DesktopDataDirectoryApi,
  loadDataDirectoryPathCommand,
  openDataDirectoryCommand,
  recordSettingsSavedCommand,
  type SettingsCommandEnvironment,
} from './settingsCommands.ts';

export interface SettingsControllerInput {
  readonly dataDirectoryApi: DesktopDataDirectoryApi | null;
  readonly initialOpen?: boolean | undefined;
  readonly now?: (() => number) | undefined;
  readonly onStatus: (message: string) => void;
  readonly recordActivity: SettingsCommandEnvironment['recordActivity'];
  readonly setAppearanceMode: (mode: AppearanceMode) => Promise<void>;
}

export interface SettingsController {
  readonly changeTheme: (mode: AppearanceMode) => void;
  readonly dataDirectoryPath: string | null | undefined;
  readonly open: boolean;
  readonly openDataDirectory: () => Promise<void>;
  readonly openSettings: () => void;
  readonly recordSettingsSaved: (patch: SettingsPatch) => void;
  readonly setOpen: (open: boolean) => void;
}

export function useSettingsController(input: SettingsControllerInput): SettingsController {
  const [open, setOpen] = useState(input.initialOpen ?? false);
  const [dataDirectoryPath, setDataDirectoryPath] = useState<string | null | undefined>(undefined);
  const now = input.now ?? Date.now;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDataDirectoryPath(undefined);
    void loadDataDirectoryPathCommand(input.dataDirectoryApi).then((path) => {
      if (!cancelled) setDataDirectoryPath(path);
    });
    return () => {
      cancelled = true;
    };
  }, [input.dataDirectoryApi, open]);

  const commandEnv = useMemo<SettingsCommandEnvironment>(
    () => ({
      now,
      onStatus: input.onStatus,
      recordActivity: input.recordActivity,
    }),
    [input.onStatus, input.recordActivity, now],
  );

  const changeTheme = useCallback(
    (mode: AppearanceMode) => {
      void changeAppearanceModeCommand(commandEnv, {
        mode,
        setMode: input.setAppearanceMode,
      });
    },
    [commandEnv, input.setAppearanceMode],
  );

  const openDataDirectory = useCallback(async () => {
    await openDataDirectoryCommand(commandEnv, input.dataDirectoryApi);
  }, [commandEnv, input.dataDirectoryApi]);

  const recordSettingsSaved = useCallback(
    (patch: SettingsPatch) => {
      recordSettingsSavedCommand(commandEnv, patch);
    },
    [commandEnv],
  );

  const openSettings = useCallback(() => setOpen(true), []);

  return {
    changeTheme,
    dataDirectoryPath,
    open,
    openDataDirectory,
    openSettings,
    recordSettingsSaved,
    setOpen,
  };
}
