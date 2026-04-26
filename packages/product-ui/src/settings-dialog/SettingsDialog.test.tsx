import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../appearance/AppearanceProvider.tsx';
import { SettingsDialog } from './SettingsDialog.tsx';

describe('SettingsDialog', () => {
  it('updates appearance mode', async () => {
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
      <AppearanceProvider settings={settings}>
        <SettingsDialog open />
      </AppearanceProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'dark' }));
    await waitFor(async () => expect((await settings.load()).theme).toBe('dark'));
  });
});
