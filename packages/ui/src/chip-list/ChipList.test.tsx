import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChipList } from './ChipList.tsx';

describe('ChipList', () => {
  it('renders up to max items and an overflow badge', () => {
    render(
      <ChipList
        items={['one', 'two', 'three']}
        maxItems={2}
        getKey={(item) => item}
        renderItem={(item) => <button type='button'>{item}</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'one' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'two' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'three' })).toBeNull();
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('allows custom overflow rendering', () => {
    render(
      <ChipList
        items={['one', 'two', 'three']}
        maxItems={1}
        getKey={(item) => item}
        renderItem={(item) => item}
        renderOverflow={(count) => <strong>{count} hidden</strong>}
      />,
    );

    expect(screen.getByText('2 hidden')).toBeTruthy();
  });
});
