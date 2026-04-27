import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { AppearanceProvider } from '@firebase-desk/product-ui';
import type { SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { type CSSProperties, useEffect, useState } from 'react';
import splashLogoUrl from '../assets/splash-logo.png';
import { AppShell } from './AppShell.tsx';
import { createAppQueryClient } from './queryClient.ts';
import { createMockRepositories, RepositoryProvider } from './RepositoryProvider.tsx';

const repositories = createMockRepositories();
const queryClient = createAppQueryClient();

function SplashScreen() {
  return (
    <section
      aria-label='Loading Firebase Desk'
      className='grid h-screen place-items-center bg-slate-50 px-8'
    >
      <div className='flex w-full max-w-136 flex-col items-center'>
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
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);

  useEffect(() => {
    repositories.settings.load().then(setSnapshot);
  }, []);

  if (!snapshot) return <SplashScreen />;

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
              <AppShell initialSidebarWidth={snapshot.sidebarWidth} />
            </div>
          </AppearanceProvider>
        </HotkeysProvider>
      </QueryClientProvider>
    </RepositoryProvider>
  );
}
