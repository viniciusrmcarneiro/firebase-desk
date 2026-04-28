import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NestedValueTree } from './NestedValueTree.tsx';

describe('NestedValueTree', () => {
  it('renders nested object values', () => {
    render(<NestedValueTree value={{ customer: { name: 'Ada' }, total: 10 }} />);

    expect(screen.getByText('customer')).toBeTruthy();
    expect(screen.getByText('name')).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('total')).toBeTruthy();
  });
});
