import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DockedPanel, Panel, PanelBody, PanelHeader } from './Panel.tsx';

describe('Panel', () => {
  it('renders header actions and body', () => {
    render(
      <Panel>
        <PanelHeader actions={<button type='button'>Run</button>}>Query</PanelHeader>
        <PanelBody>Results</PanelBody>
      </Panel>,
    );
    expect(screen.getByText('Query')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Run' })).toBeDefined();
    expect(screen.getByText('Results')).toBeDefined();
  });

  it('renders a docked panel boundary', () => {
    render(<DockedPanel aria-label='Activity'>Activity</DockedPanel>);

    const panel = screen.getByRole('region', { name: 'Activity' });
    expect(panel.className).toContain('border-t');
    expect(panel.className).toContain('border-border-strong');
  });
});
