import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../button/Button.tsx';
import { EmptyState } from './EmptyState.tsx';

describe('EmptyState', () => {
  it('renders title, description, and action', () => {
    render(
      <EmptyState action={<Button>Add</Button>} description='No projects yet' title='Empty' />,
    );
    expect(screen.getByText('Empty')).toBeDefined();
    expect(screen.getByText('No projects yet')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDefined();
  });
});
