import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../button/Button.tsx';
import { Tooltip } from './Tooltip.tsx';

describe('Tooltip', () => {
  it('renders the trigger', () => {
    render(
      <Tooltip content='Open command palette'>
        <Button>Commands</Button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Commands' })).toBeDefined();
  });
});
