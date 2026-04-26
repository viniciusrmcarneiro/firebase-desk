import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent } from './Dialog.tsx';

describe('Dialog', () => {
  it('renders open dialog content', () => {
    render(
      <Dialog open>
        <DialogContent description='Configure the app' title='Settings'>Body</DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });
});
