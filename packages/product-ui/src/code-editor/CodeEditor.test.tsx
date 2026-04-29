import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../appearance/AppearanceProvider.tsx';
import { CodeEditor } from './CodeEditor.tsx';

vi.mock('@monaco-editor/react', () => ({
  default: (
    {
      options,
      theme,
      value,
    }: {
      readonly options?: { readonly ariaLabel?: string; };
      readonly theme: string;
      readonly value: string;
    },
  ) => (
    <textarea
      aria-label={options?.ariaLabel}
      data-testid='monaco'
      data-theme={theme}
      readOnly
      value={value}
    />
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

  it('passes an accessible label to Monaco', async () => {
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <CodeEditor ariaLabel='Document JSON' language='json' value='{}' />
      </AppearanceProvider>,
    );
    expect(await screen.findByLabelText('Document JSON')).toBeTruthy();
  });
});
