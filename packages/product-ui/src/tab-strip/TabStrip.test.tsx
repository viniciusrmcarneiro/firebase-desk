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
        tabs={[{ id: 'firestore', label: 'Firestore' }, { id: 'auth', label: 'Auth' }]}
      />,
    );
    const tab = screen.getByRole('tab', { name: 'Auth' });
    const inactiveTab = screen.getByRole('tab', { name: 'Firestore' });
    expect(tab.getAttribute('data-state')).toBe('active');
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(tab.getAttribute('tabIndex')).toBe('0');
    expect(inactiveTab.getAttribute('aria-selected')).toBe('false');
    expect(inactiveTab.getAttribute('tabIndex')).toBe('-1');
    fireEvent.click(tab);
    expect(onSelectTab).toHaveBeenCalledWith('auth');
  });
});
