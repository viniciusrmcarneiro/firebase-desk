import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { AppearanceProvider } from '@firebase-desk/product-ui';
import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell.tsx';

function renderShell() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  const settings = new MockSettingsRepository();
  render(
    <HotkeysProvider settings={settings}>
      <AppearanceProvider settings={settings}>
        <AppShell />
      </AppearanceProvider>
    </HotkeysProvider>,
  );
}

describe('desktop AppShell demo', () => {
  it('flips html data-theme from the theme toggle', async () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  });
});
