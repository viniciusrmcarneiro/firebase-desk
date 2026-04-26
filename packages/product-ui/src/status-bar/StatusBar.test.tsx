import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBar } from './StatusBar.tsx';

describe('StatusBar', () => {
  it('renders left and right slots', () => {
    render(<StatusBar left='Connected' right='Emulator' />);
    expect(screen.getByText('Connected')).toBeDefined();
    expect(screen.getByText('Emulator')).toBeDefined();
  });
});
