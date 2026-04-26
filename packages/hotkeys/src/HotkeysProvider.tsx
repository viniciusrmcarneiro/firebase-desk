import type { HotkeyOverrides, SettingsRepository } from '@firebase-desk/repo-contracts';
import { HotkeysProvider as TanStackHotkeysProvider } from '@tanstack/react-hotkeys';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface HotkeysContextValue {
  readonly overrides: HotkeyOverrides;
}

const HotkeysContext = createContext<HotkeysContextValue>({ overrides: {} });

export interface HotkeysProviderProps {
  readonly settings: SettingsRepository;
  readonly children: ReactNode;
}

export function HotkeysProvider({ settings, children }: HotkeysProviderProps) {
  const [overrides, setOverrides] = useState<HotkeyOverrides>({});

  useEffect(() => {
    let cancelled = false;
    settings.getHotkeyOverrides().then((next) => {
      if (!cancelled) setOverrides(next);
    });
    return () => {
      cancelled = true;
    };
  }, [settings]);

  const value = useMemo<HotkeysContextValue>(() => ({ overrides }), [overrides]);

  return (
    <HotkeysContext.Provider value={value}>
      <TanStackHotkeysProvider>{children}</TanStackHotkeysProvider>
    </HotkeysContext.Provider>
  );
}

export function useHotkeyOverrides(): HotkeyOverrides {
  return useContext(HotkeysContext).overrides;
}
