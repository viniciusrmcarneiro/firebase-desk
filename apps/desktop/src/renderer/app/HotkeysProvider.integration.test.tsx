import { HotkeysProvider, useHotkeyOverrides } from '@firebase-desk/hotkeys';
import type { SettingsRepository } from '@firebase-desk/repo-contracts';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-hotkeys', () => ({
  HotkeysProvider: ({ children }: { readonly children: ReactNode; }) => <>{children}</>,
}));

describe('HotkeysProvider integration', () => {
  it('reports failed override loads and keeps defaults active', async () => {
    const onError = vi.fn();
    const settings: SettingsRepository = {
      getHotkeyOverrides: vi.fn(async () => {
        throw new Error('hotkeys unavailable');
      }),
      load: vi.fn(),
      save: vi.fn(),
      setHotkeyOverrides: vi.fn(),
    };

    render(
      <HotkeysProvider settings={settings} onError={onError}>
        <HotkeyProbe />
      </HotkeysProvider>,
    );

    expect(screen.getByText('default')).toBeTruthy();
    await waitFor(() => expect(onError).toHaveBeenCalledWith('hotkeys unavailable'));
  });
});

function HotkeyProbe() {
  const overrides = useHotkeyOverrides();
  return <div>{overrides['tab.new'] ?? 'default'}</div>;
}
