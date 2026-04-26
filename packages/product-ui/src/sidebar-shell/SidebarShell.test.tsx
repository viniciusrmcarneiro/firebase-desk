import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SidebarShell } from './SidebarShell.tsx';

describe('SidebarShell', () => {
  it('renders title and content', () => {
    render(<SidebarShell title='Firebase Desk'>Tree</SidebarShell>);
    expect(screen.getByText('Firebase Desk')).toBeDefined();
    expect(screen.getByText('Tree')).toBeDefined();
  });
});
