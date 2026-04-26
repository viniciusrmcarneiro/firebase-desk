import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../appearance/AppearanceProvider.tsx';
import { CodeEditor } from './CodeEditor.tsx';

vi.mock('@monaco-editor/react', () => ({
  default: ({ theme, value }: { readonly theme: string; readonly value: string; }) => (
    <textarea data-testid='monaco' data-theme={theme} readOnly value={value} />
  ),
}));

describe('CodeEditor', () => {
  it('passes resolved appearance to Monaco', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <CodeEditor language='json' value='{}' />
      </AppearanceProvider>,
    );
    expect((await screen.findByTestId('monaco')).getAttribute('data-theme')).toBe('vs-dark');
  });
});
