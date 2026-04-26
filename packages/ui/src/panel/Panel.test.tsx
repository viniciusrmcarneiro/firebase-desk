import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel, PanelBody, PanelHeader } from './Panel.tsx';

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
});
