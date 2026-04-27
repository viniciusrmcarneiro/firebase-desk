import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { AppearanceProvider } from '@firebase-desk/product-ui';
import type { SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { type CSSProperties, useEffect, useState } from 'react';
import { AppShell } from './AppShell.tsx';
import { createAppQueryClient } from './queryClient.ts';
import { createMockRepositories, RepositoryProvider } from './RepositoryProvider.tsx';

const repositories = createMockRepositories();
const queryClient = createAppQueryClient();

export function App() {
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);

  useEffect(() => {
    repositories.settings.load().then(setSnapshot);
  }, []);

  if (!snapshot) return null;

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
