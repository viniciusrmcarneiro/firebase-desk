import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InlineAlert } from './InlineAlert.tsx';

describe('InlineAlert', () => {
  it('uses alert role for warning states', () => {
    render(<InlineAlert variant='warning'>Production target</InlineAlert>);
    expect(screen.getByRole('alert').textContent).toBe('Production target');
  });
});
