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
        <SettingsDialog open onOpenChange={vi.fn()} />
      </AppearanceProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'dark' }));
    await waitFor(async () => expect((await settings.load()).theme).toBe('dark'));
  });

  it('notifies when the controlled dialog should close', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const onOpenChange = vi.fn();
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <SettingsDialog open onOpenChange={onOpenChange} />
      </AppearanceProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('updates density when density controls are provided', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const onDensityChange = vi.fn();
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <SettingsDialog
          density='compact'
          open
          onDensityChange={onDensityChange}
          onOpenChange={vi.fn()}
        />
      </AppearanceProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'comfortable density' }));
    expect(onDensityChange).toHaveBeenCalledWith('comfortable');
  });

  it('updates data mode immediately', async () => {
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
        <SettingsDialog open onOpenChange={vi.fn()} />
      </AppearanceProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'live data mode' }));

    await waitFor(async () => expect((await settings.load()).dataMode).toBe('live'));
  });

  it('shows settings save failures', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const settings = new MockSettingsRepository();
    vi.spyOn(settings, 'save').mockRejectedValueOnce(new Error('Could not rename settings file'));
    render(
      <AppearanceProvider settings={settings}>
        <SettingsDialog open onOpenChange={vi.fn()} />
      </AppearanceProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'live data mode' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Could not rename settings file',
    );
  });

  it('shows the local data folder and opens it', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const onOpenDataDirectory = vi.fn(async () => {});
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <SettingsDialog
          dataDirectoryPath='/Users/vini/Library/Application Support/@firebase-desk/desktop'
          open
          onOpenChange={vi.fn()}
          onOpenDataDirectory={onOpenDataDirectory}
        />
      </AppearanceProvider>,
    );

    expect(screen.getByLabelText('Data storage folder').textContent).toBe(
      '/Users/vini/Library/Application Support/@firebase-desk/desktop',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open location' }));

    await waitFor(() => expect(onOpenDataDirectory).toHaveBeenCalledTimes(1));
  });

  it('shows local data folder open failures', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <SettingsDialog
          dataDirectoryPath='/tmp/firebase-desk'
          open
          onOpenChange={vi.fn()}
          onOpenDataDirectory={async () => Promise.reject(new Error('Finder refused'))}
        />
      </AppearanceProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open location' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Finder refused');
  });

  it('renders settings-backed about and safety details', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const settings = new MockSettingsRepository();
    await settings.save({ sidebarWidth: 412, inspectorWidth: 388 });
    render(
      <AppearanceProvider settings={settings}>
        <SettingsDialog open onOpenChange={vi.fn()} />
      </AppearanceProvider>,
    );

    expect(await screen.findByText('Saved settings')).toBeTruthy();
    expect(screen.getByText('412px')).toBeTruthy();
    expect(screen.getByText('Credential storage')).toBeTruthy();
    expect(screen.getByText('Data safety')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });
});
