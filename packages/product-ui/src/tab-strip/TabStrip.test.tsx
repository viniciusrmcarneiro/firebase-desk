import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabStrip } from './TabStrip.tsx';

describe('TabStrip', () => {
  it('marks active tab and emits selection', () => {
    const onSelectTab = vi.fn();
    render(
      <TabStrip
        activeTabId='auth'
        onSelectTab={onSelectTab}
        tabs={[{ id: 'auth', label: 'Auth' }]}
      />,
    );
    const tab = screen.getByRole('tab', { name: 'Auth' });
    expect(tab.getAttribute('data-state')).toBe('active');
    fireEvent.click(tab);
    expect(onSelectTab).toHaveBeenCalledWith('auth');
  });
});
