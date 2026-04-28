import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JsonPreview } from './JsonPreview.tsx';

describe('JsonPreview', () => {
  it('renders formatted json', () => {
    render(<JsonPreview value={{ ok: true }} />);

    expect(screen.getByText(/"ok": true/)).toBeTruthy();
  });
});
