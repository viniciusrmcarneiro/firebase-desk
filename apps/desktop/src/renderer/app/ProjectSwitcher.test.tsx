import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectSwitcher } from './ProjectSwitcher.tsx';

const productionProject: ProjectSummary = {
  id: 'prod',
  name: 'Production account',
  projectId: 'prod-id',
  target: 'production',
  hasCredential: true,
  credentialEncrypted: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const emulatorProject: ProjectSummary = {
  id: 'emu',
  name: 'Local emulator',
  projectId: 'demo-local',
  target: 'emulator',
  emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
  hasCredential: false,
  credentialEncrypted: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('ProjectSwitcher', () => {
  it('does not label production and only flags emulator targets', async () => {
    render(
      <ProjectSwitcher
        activeProject={emulatorProject}
        projects={[productionProject, emulatorProject]}
        onConnectionChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Select connection' });
    expect(within(trigger).getByText('emulator')).toBeTruthy();
    expect(screen.queryByText(/^production$/i)).toBeNull();

    fireEvent.pointerDown(trigger);
    expect(await screen.findByRole('menuitem', { name: 'Production account' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /Local emulator/ })).toBeTruthy();
    expect(screen.queryByText(/^production$/i)).toBeNull();
  });

  it('keeps production active connection unlabeled', () => {
    render(
      <ProjectSwitcher
        activeProject={productionProject}
        projects={[productionProject, emulatorProject]}
        onConnectionChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Select connection' });
    expect(within(trigger).queryByText(/^production$/i)).toBeNull();
    expect(within(trigger).queryByText('emulator')).toBeNull();
  });
});
