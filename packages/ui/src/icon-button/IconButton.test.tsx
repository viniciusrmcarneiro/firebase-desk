import { render, screen } from '@testing-library/react';
import { Settings } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { IconButton } from './IconButton.tsx';

describe('IconButton', () => {
  it('uses the label for accessible name and tooltip title', () => {
    render(<IconButton icon={<Settings aria-hidden='true' />} label='Settings' />);
    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button.getAttribute('title')).toBe('Settings');
  });
});
