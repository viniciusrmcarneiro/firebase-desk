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
  readonly onError?: ((message: string) => void) | undefined;
}

export function HotkeysProvider({ settings, children, onError }: HotkeysProviderProps) {
  const [overrides, setOverrides] = useState<HotkeyOverrides>({});

  useEffect(() => {
    let cancelled = false;
    settings.getHotkeyOverrides().then((next) => {
      if (!cancelled) setOverrides(next);
    }).catch((error) => {
      if (!cancelled) onError?.(messageFromError(error, 'Could not load hotkey overrides.'));
    });
    return () => {
      cancelled = true;
    };
  }, [onError, settings]);

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

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
