import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette.tsx';

describe('CommandPalette', () => {
  it('renders default-open commands', () => {
    render(
      <HotkeysProvider settings={new MockSettingsRepository()}>
        <CommandPalette
          commands={[{ id: 'settings', label: 'Open Settings', onSelect: () => {} }]}
          defaultOpen
        />
      </HotkeysProvider>,
    );
    expect(screen.getByText('Open Settings')).toBeDefined();
  });

  it('closes after selecting a command', async () => {
    const onSelect = vi.fn();
    render(
      <HotkeysProvider settings={new MockSettingsRepository()}>
        <CommandPalette
          commands={[{ id: 'settings', label: 'Open Settings', onSelect }]}
          defaultOpen
        />
      </HotkeysProvider>,
    );

    fireEvent.click(screen.getByText('Open Settings'));

    expect(onSelect).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText('Open Settings')).toBeNull());
  });
});
