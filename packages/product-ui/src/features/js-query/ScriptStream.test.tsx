import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScriptStream } from './ScriptStream.tsx';

describe('ScriptStream', () => {
  it('shows empty state when there are no renderable items', () => {
    render(<ScriptStream items={[]} />);

    expect(screen.getByText('No data to show')).toBeTruthy();
  });

  it('renders json stream cards', async () => {
    render(
      <ScriptStream
        items={[{
          id: 'yield-1',
          label: 'yield 1',
          badge: 'Object(1)',
          view: 'json',
          value: { ok: true },
        }]}
      />,
    );

    expect(screen.getByText('yield 1')).toBeTruthy();
    expect(screen.getByText('Object(1)')).toBeTruthy();
    expect(await screen.findByText(/"ok": true/)).toBeTruthy();
  });
});
