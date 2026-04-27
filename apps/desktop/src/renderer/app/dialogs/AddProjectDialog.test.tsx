import type {
  ProjectAddInput,
  ProjectsRepository,
  ProjectSummary,
} from '@firebase-desk/repo-contracts';
import { MockProjectsRepository } from '@firebase-desk/repo-mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AddProjectDialog } from './AddProjectDialog.tsx';

describe('AddProjectDialog', () => {
  it('resets fields when reopened after adding an account', async () => {
    const onSubmit = vi.fn(async (input: ProjectAddInput) => projectFromInput(input));
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open add account' }));
    activateTab('Local emulator');
    fireEvent.change(screen.getByRole('textbox', { name: 'Display name' }), {
      target: { value: 'Old Local' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Firebase project id' }), {
      target: { value: 'old-local' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Firestore emulator host' }), {
      target: { value: 'localhost:8082' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add Firebase Account' })).toBeNull()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open add account' }));

    expect((screen.getByRole('textbox', { name: 'Display name' }) as HTMLInputElement).value).toBe(
      '',
    );
    expect(
      (screen.getByRole('textbox', { name: 'Service account JSON' }) as HTMLTextAreaElement).value,
    )
      .toBe('');
    activateTab('Local emulator');
    expect((screen.getByRole('textbox', { name: 'Firebase project id' }) as HTMLInputElement).value)
      .toBe('demo-local');
    expect(
      (screen.getByRole('textbox', { name: 'Firestore emulator host' }) as HTMLInputElement).value,
    )
      .toBe('127.0.0.1:8080');
    expect((screen.getByRole('textbox', { name: 'Auth emulator host' }) as HTMLInputElement).value)
      .toBe('127.0.0.1:9099');
  });

  it('shows add failures in the dialog', async () => {
    render(<Harness onSubmit={async () => Promise.reject(new Error('Store is not writable'))} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open add account' }));
    activateTab('Local emulator');
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Store is not writable');
  });
});

function activateTab(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false });
}

function Harness(
  {
    onSubmit,
    projects = new MockProjectsRepository(),
  }: {
    readonly onSubmit: (input: ProjectAddInput) => Promise<ProjectSummary>;
    readonly projects?: ProjectsRepository;
  },
) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type='button' onClick={() => setOpen(true)}>Open add account</button>
      <AddProjectDialog
        open={open}
        projects={projects}
        onOpenChange={setOpen}
        onSubmit={onSubmit}
      />
    </>
  );
}

function projectFromInput(input: ProjectAddInput): ProjectSummary {
  return {
    id: input.projectId,
    name: input.name,
    projectId: input.projectId,
    target: input.target,
    ...(input.emulator ? { emulator: input.emulator } : {}),
    hasCredential: Boolean(input.credentialJson),
    credentialEncrypted: input.credentialJson ? true : null,
    createdAt: '2026-04-27T00:00:00.000Z',
  };
}
