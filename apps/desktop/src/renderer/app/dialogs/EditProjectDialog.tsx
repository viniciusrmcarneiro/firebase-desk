import type { ProjectSummary, ProjectUpdatePatch } from '@firebase-desk/repo-contracts';
import { Button, Dialog, DialogContent, InlineAlert, Input } from '@firebase-desk/ui';
import { useEffect, useState } from 'react';

interface EditProjectDialogProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (id: string, patch: ProjectUpdatePatch) => Promise<ProjectSummary>;
  readonly open: boolean;
  readonly project: ProjectSummary | null;
}

export function EditProjectDialog(
  { onOpenChange, onSubmit, open, project }: EditProjectDialogProps,
) {
  const [name, setName] = useState('');
  const [firestoreHost, setFirestoreHost] = useState('');
  const [authHost, setAuthHost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!project || !open) return;
    setName(project.name);
    setFirestoreHost(project.emulator?.firestoreHost ?? '127.0.0.1:8080');
    setAuthHost(project.emulator?.authHost ?? '127.0.0.1:9099');
    setError(null);
  }, [open, project]);

  async function handleSubmit() {
    if (!project || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(project.id, {
        name: name.trim(),
        ...(project.target === 'emulator'
          ? { emulator: { firestoreHost: firestoreHost.trim(), authHost: authHost.trim() } }
          : {}),
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update project.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent description='Edit local project metadata.' title='Edit Firebase Account'>
        {project?.credentialEncrypted === false
          ? (
            <InlineAlert variant='warning'>
              Credentials for this account are stored without OS encryption on this machine.
            </InlineAlert>
          )
          : null}
        <label className='grid gap-1.5'>
          <span className='text-xs font-semibold text-text-secondary'>Display name</span>
          <Input
            aria-label='Display name'
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <div className='grid gap-1 rounded-md border border-border-subtle bg-bg-subtle p-3 text-sm'>
          <span className='text-text-muted'>Firebase project id</span>
          <span className='font-mono text-xs text-text-primary'>
            {project?.projectId ?? 'unknown'}
          </span>
        </div>
        {project?.target === 'emulator'
          ? (
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <label className='grid gap-1.5'>
                <span className='text-xs font-semibold text-text-secondary'>Firestore host</span>
                <Input
                  aria-label='Firestore emulator host'
                  value={firestoreHost}
                  onChange={(event) => setFirestoreHost(event.currentTarget.value)}
                />
              </label>
              <label className='grid gap-1.5'>
                <span className='text-xs font-semibold text-text-secondary'>Auth host</span>
                <Input
                  aria-label='Auth emulator host'
                  value={authHost}
                  onChange={(event) => setAuthHost(event.currentTarget.value)}
                />
              </label>
            </div>
          )
          : null}
        {error ? <InlineAlert variant='danger'>{error}</InlineAlert> : null}
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={isSaving || !name.trim()} variant='primary' onClick={handleSubmit}>
            {isSaving ? 'Saving' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
