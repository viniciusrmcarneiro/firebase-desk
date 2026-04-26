import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
