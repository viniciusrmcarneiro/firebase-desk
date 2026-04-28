import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JsonPreview } from './JsonPreview.tsx';

describe('JsonPreview', () => {
  it('renders formatted json lazily', async () => {
    render(<JsonPreview value={{ ok: true }} />);

    expect(screen.getByText('Formatting JSON...')).toBeTruthy();
    expect(await screen.findByText(/"ok": true/)).toBeTruthy();
  });

  it('does not stringify while inactive', () => {
    const toJSON = vi.fn(() => ({ ok: true }));

    render(<JsonPreview active={false} value={{ toJSON }} />);

    expect(toJSON).not.toHaveBeenCalled();
  });

  it('renders textarea previews as a fill element', async () => {
    render(<JsonPreview mode='textarea' value={{ ok: true }} />);

    const preview = await screen.findByLabelText('JSON preview');
    expect(preview.className).toContain('h-full');
    expect(preview.className).toContain('min-h-0');
  });
});
