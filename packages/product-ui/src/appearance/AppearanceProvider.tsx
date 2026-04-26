import {
  type AppearanceMode,
  defaultAppearanceSettings,
  type ThemeName,
} from '@firebase-desk/design-tokens';
import type { SettingsRepository } from '@firebase-desk/repo-contracts';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface AppearanceContextValue {
  readonly mode: AppearanceMode;
  readonly resolvedTheme: ThemeName;
  readonly setMode: (mode: AppearanceMode) => Promise<void>;
  readonly settings: SettingsRepository;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export interface AppearanceProviderProps {
  readonly children: ReactNode;
  readonly settings: SettingsRepository;
}

function getSystemTheme(): ThemeName {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: AppearanceMode, systemTheme: ThemeName): ThemeName {
  return mode === 'system' ? systemTheme : mode;
}

export function AppearanceProvider({ children, settings }: AppearanceProviderProps) {
  const [mode, setModeState] = useState<AppearanceMode>(defaultAppearanceSettings.mode);
  const [systemTheme, setSystemTheme] = useState<ThemeName>(() => getSystemTheme());
  const resolvedTheme = resolveTheme(mode, systemTheme);

  useEffect(() => {
    let cancelled = false;
    settings.load().then((snapshot) => {
      if (!cancelled) setModeState(snapshot.theme);
    });
    return () => {
      cancelled = true;
    };
  }, [settings]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', listener);
    return () => {
      media.removeEventListener('change', listener);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const setMode = useCallback(
    async (nextMode: AppearanceMode) => {
      setModeState(nextMode);
      await settings.save({ theme: nextMode });
    },
    [settings],
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({ mode, resolvedTheme, setMode, settings }),
    [mode, resolvedTheme, setMode, settings],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('useAppearance must be used within AppearanceProvider');
  return value;
}
