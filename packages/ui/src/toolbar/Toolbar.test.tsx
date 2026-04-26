import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../button/Button.tsx';
import { Toolbar } from './Toolbar.tsx';

describe('Toolbar', () => {
  it('renders a toolbar landmark', () => {
    render(
      <Toolbar aria-label='Query tools'>
        <Button>Run</Button>
      </Toolbar>,
    );
    expect(screen.getByRole('toolbar', { name: 'Query tools' })).toBeDefined();
  });
});
