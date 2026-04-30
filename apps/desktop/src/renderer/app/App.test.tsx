import type { SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

const settingsLoad = vi.hoisted(() => vi.fn());

vi.mock('@firebase-desk/hotkeys', () => ({
  HotkeysProvider: ({ children }: { readonly children: ReactNode; }) => <>{children}</>,
}));

vi.mock('@firebase-desk/product-ui', () => ({
  AppearanceProvider: ({ children }: { readonly children: ReactNode; }) => <>{children}</>,
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { readonly children: ReactNode; }) => <>{children}</>,
}));

vi.mock('./AppShell.tsx', () => ({
  AppShell: () => <div data-testid='app-shell' />,
}));

vi.mock('./queryClient.ts', () => ({
  createAppQueryClient: () => ({}),
}));

vi.mock('./RepositoryProvider.tsx', () => ({
  createRepositories: () => ({
    settings: { load: settingsLoad },
  }),
  RepositoryProvider: ({ children }: { readonly children: ReactNode; }) => <>{children}</>,
}));

describe('desktop App', () => {
  beforeEach(() => {
    settingsLoad.mockReset();
    vi.stubGlobal('firebaseDesk', undefined);
  });

  it('shows the splash while settings load', () => {
    settingsLoad.mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByLabelText('Loading Firebase Desk')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Firebase Desk' })).toBeTruthy();
  });

  it('shows the app shell after settings load', async () => {
    settingsLoad.mockResolvedValue(settingsSnapshot());

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('app-shell')).toBeTruthy());
    expect(screen.queryByLabelText('Loading Firebase Desk')).toBeNull();
  });

  it('shows a retryable boot failure when config load fails', async () => {
    const getConfig = vi.fn()
      .mockRejectedValueOnce(new Error('config unavailable'))
      .mockResolvedValue({ dataMode: 'mock' });
    settingsLoad.mockResolvedValue(settingsSnapshot());
    vi.stubGlobal('firebaseDesk', { app: { getConfig } });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByLabelText('Firebase Desk failed to start')).toBeTruthy()
    );
    expect(screen.getByText('config unavailable')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByTestId('app-shell')).toBeTruthy());
    expect(getConfig).toHaveBeenCalledTimes(2);
  });

  it('shows a retryable boot failure when settings load fails', async () => {
    settingsLoad.mockRejectedValueOnce(new Error('settings unavailable'))
      .mockResolvedValue(settingsSnapshot());

    render(<App />);

    await waitFor(() =>
      expect(screen.getByLabelText('Firebase Desk failed to start')).toBeTruthy()
    );
    expect(screen.getByText('settings unavailable')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByTestId('app-shell')).toBeTruthy());
    expect(settingsLoad).toHaveBeenCalledTimes(2);
  });
});

function settingsSnapshot(): SettingsSnapshot {
  return {
    activityLog: {
      detailMode: 'metadata',
      enabled: true,
      maxBytes: 5 * 1024 * 1024,
    },
    sidebarWidth: 280,
    inspectorWidth: 360,
    theme: 'system',
    dataMode: 'mock',
    hotkeyOverrides: {},
    resultTableLayouts: {},
    firestoreFieldCatalogs: {},
    firestoreWrites: { fieldStaleBehavior: 'save-and-notify' },
  };
}
