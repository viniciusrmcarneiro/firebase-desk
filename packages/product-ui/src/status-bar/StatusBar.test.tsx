import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBar } from './StatusBar.tsx';

describe('StatusBar', () => {
  it('renders left and right slots', () => {
    render(<StatusBar left='Connected' right='Emulator' />);
    expect(screen.getByText('Connected')).toBeDefined();
    expect(screen.getByText('Emulator')).toBeDefined();
  });

  it('keeps status content on one truncating row', () => {
    const { container } = render(<StatusBar left='Connected' right='Emulator' />);
    const footer = container.querySelector('footer');
    const [left, right] = Array.from(container.querySelectorAll('footer > div'));

    expect(footer?.className).toContain('whitespace-nowrap');
    expect(footer?.className).toContain('overflow-hidden');
    expect(left?.className).toContain('flex-1');
    expect(left?.className).toContain('overflow-hidden');
    expect(right?.className).toContain('max-w-[55%]');
    expect(right?.className).toContain('overflow-hidden');
  });
});
