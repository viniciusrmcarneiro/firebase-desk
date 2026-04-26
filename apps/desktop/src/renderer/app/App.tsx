import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { AppearanceProvider } from '@firebase-desk/product-ui';
import type { SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { type CSSProperties, useEffect, useState } from 'react';
import { AppShell } from './AppShell.tsx';

const settings = new MockSettingsRepository();

export function App() {
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);

  useEffect(() => {
    settings.load().then(setSnapshot);
  }, []);

  if (!snapshot) return null;

  return (
    <HotkeysProvider settings={settings}>
      <AppearanceProvider settings={settings}>
        <div
          style={{
            '--sidebar-width': `${snapshot.sidebarWidth}px`,
            '--inspector-width': `${snapshot.inspectorWidth}px`,
            height: '100vh',
          } as CSSProperties}
        >
          <AppShell />
        </div>
      </AppearanceProvider>
    </HotkeysProvider>
  );
}
