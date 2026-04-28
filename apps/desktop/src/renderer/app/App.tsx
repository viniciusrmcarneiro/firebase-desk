import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { AppearanceProvider } from '@firebase-desk/product-ui';
import type { DataMode, SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import splashLogoUrl from '../assets/splash-logo.png';
import { AppShell } from './AppShell.tsx';
import { createAppQueryClient } from './queryClient.ts';
import { createRepositories, RepositoryProvider } from './RepositoryProvider.tsx';

function SplashScreen() {
  return (
    <section
      aria-label='Loading Firebase Desk'
      className='grid h-screen place-items-center bg-slate-50 px-8'
    >
      <div className='flex w-full max-w-[34rem] flex-col items-center'>
        <img
          src={splashLogoUrl}
          alt='Firebase Desk'
          className='w-full object-contain'
          draggable={false}
        />
        <div
          aria-hidden='true'
          className='mt-6 h-1 w-28 overflow-hidden rounded-full bg-slate-200'
        >
          <div className='h-full w-2/5 rounded-full bg-action-primary motion-safe:animate-pulse' />
        </div>
      </div>
    </section>
  );
}

export function App() {
  const [dataMode, setDataMode] = useState<DataMode | null>(null);
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);
  const [queryClient, setQueryClient] = useState(() => createAppQueryClient());

  const handleDataModeChange = useCallback((nextDataMode: DataMode) => {
    setSnapshot(null);
    setDataMode(nextDataMode);
    setQueryClient(createAppQueryClient());
  }, []);

  const repositories = useMemo(
    () =>
      dataMode
        ? createRepositories({ dataMode, onDataModeChange: handleDataModeChange })
        : null,
    [dataMode, handleDataModeChange],
  );

  useEffect(() => {
    let cancelled = false;
    loadInitialDataMode().then((config) => {
      if (!cancelled) setDataMode(config.dataMode);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!repositories) return;
    let cancelled = false;
    repositories.settings.load().then((nextSnapshot) => {
      if (!cancelled) setSnapshot(nextSnapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [repositories]);

  if (!repositories || !snapshot) return <SplashScreen />;

  return (
    <RepositoryProvider repositories={repositories}>
      <QueryClientProvider client={queryClient}>
        <HotkeysProvider settings={repositories.settings}>
          <AppearanceProvider settings={repositories.settings}>
            <div
              style={{
                '--sidebar-width': `${snapshot.sidebarWidth}px`,
                '--inspector-width': `${snapshot.inspectorWidth}px`,
                height: '100vh',
              } as CSSProperties}
            >
              <AppShell dataMode={dataMode ?? 'mock'} initialSidebarWidth={snapshot.sidebarWidth} />
            </div>
          </AppearanceProvider>
        </HotkeysProvider>
      </QueryClientProvider>
    </RepositoryProvider>
  );
}

async function loadInitialDataMode(): Promise<{ readonly dataMode: DataMode; }> {
  if (typeof window !== 'undefined' && window.firebaseDesk?.app?.getConfig) {
    return await window.firebaseDesk.app.getConfig();
  }
  return { dataMode: 'mock' };
}
