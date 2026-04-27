import type {
  ProjectAddInput,
  ProjectsRepository,
  ProjectSummary,
  ServiceAccountValidationResult,
} from '@firebase-desk/repo-contracts';
import {
  Button,
  Dialog,
  DialogContent,
  InlineAlert,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@firebase-desk/ui';
import { FileJson, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AddProjectDialogProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly onProjectAdded?: (project: ProjectSummary) => void;
  readonly onSubmit: (input: ProjectAddInput) => Promise<ProjectSummary>;
  readonly open: boolean;
  readonly projects: ProjectsRepository;
}

type AddMode = 'service-account' | 'emulator';

const DEFAULT_FIRESTORE_HOST = '127.0.0.1:8080';
const DEFAULT_AUTH_HOST = '127.0.0.1:9099';

export function AddProjectDialog(
  { onOpenChange, onProjectAdded, onSubmit, open, projects }: AddProjectDialogProps,
) {
  const [mode, setMode] = useState<AddMode>('service-account');
  const [name, setName] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [validation, setValidation] = useState<ServiceAccountValidationResult | null>(null);
  const [projectId, setProjectId] = useState('demo-local');
  const [firestoreHost, setFirestoreHost] = useState(DEFAULT_FIRESTORE_HOST);
  const [authHost, setAuthHost] = useState(DEFAULT_AUTH_HOST);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open]);

  useEffect(() => {
    if (!serviceAccountJson.trim()) {
      setValidation(null);
      return;
    }

    let cancelled = false;
    validateServiceAccount(projects, serviceAccountJson)
      .then((result) => {
        if (!cancelled) setValidation(result);
      })
      .catch((caught) => {
        if (cancelled) return;
        setValidation({
          ok: false,
          errors: [messageFromError(caught, 'Could not validate JSON.')],
        });
      });
    return () => {
      cancelled = true;
    };
  }, [projects, serviceAccountJson]);

  const serviceAccountSummary = validation?.ok ? validation.summary : null;
  const resolvedName = name.trim() || serviceAccountSummary?.projectId || projectId.trim();
  const canSubmitServiceAccount = Boolean(serviceAccountSummary && serviceAccountJson.trim());
  const canSubmitEmulator = Boolean(
    resolvedName && projectId.trim() && firestoreHost.trim() && authHost.trim(),
  );
  const canSubmit = mode === 'service-account' ? canSubmitServiceAccount : canSubmitEmulator;

  async function handlePickFile() {
    if (!projects.pickServiceAccountFile) return;
    setError(null);
    try {
      const result = await projects.pickServiceAccountFile();
      if (!result.canceled && result.json) setServiceAccountJson(result.json);
    } catch (caught) {
      setError(messageFromError(caught, 'Could not read service account file.'));
    }
  }

  async function handleSubmit() {
    if (!canSubmit || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const project = await onSubmit(
        mode === 'service-account'
          ? {
            name: resolvedName,
            projectId: serviceAccountSummary?.projectId ?? '',
            target: 'production',
            credentialJson: serviceAccountJson,
          }
          : {
            name: resolvedName,
            projectId: projectId.trim(),
            target: 'emulator',
            emulator: { firestoreHost: firestoreHost.trim(), authHost: authHost.trim() },
          },
      );
      onProjectAdded?.(project);
      onOpenChange(false);
    } catch (caught) {
      setError(messageFromError(caught, 'Could not add project.'));
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    setMode('service-account');
    setName('');
    setServiceAccountJson('');
    setValidation(null);
    setProjectId('demo-local');
    setFirestoreHost(DEFAULT_FIRESTORE_HOST);
    setAuthHost(DEFAULT_AUTH_HOST);
    setError(null);
    setIsSaving(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        description='Connect a Firebase project or emulator profile.'
        title='Add Firebase Account'
      >
        <Tabs value={mode} onValueChange={(value) => setMode(value as AddMode)}>
          <TabsList>
            <TabsTrigger value='service-account'>Service account</TabsTrigger>
            <TabsTrigger value='emulator'>Local emulator</TabsTrigger>
          </TabsList>
          <TabsContent value='service-account' className='grid gap-3 pt-3'>
            <label className='grid gap-1.5'>
              <span className='text-xs font-semibold text-text-secondary'>Display name</span>
              <Input
                aria-label='Display name'
                placeholder={serviceAccountSummary?.projectId ?? 'Project name'}
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </label>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                disabled={!projects.pickServiceAccountFile}
                variant='secondary'
                onClick={handlePickFile}
              >
                <FileJson size={14} aria-hidden='true' /> Select JSON
              </Button>
              {serviceAccountSummary
                ? (
                  <span className='text-xs text-text-secondary'>
                    {serviceAccountSummary.projectId} · {serviceAccountSummary.clientEmail}
                  </span>
                )
                : null}
            </div>
            <label className='grid gap-1.5'>
              <span className='text-xs font-semibold text-text-secondary'>
                Service account JSON
              </span>
              <textarea
                aria-label='Service account JSON'
                className='min-h-36 resize-y rounded-md border border-border bg-bg-panel p-2 font-mono text-xs text-text-primary outline-none focus-visible:shadow-focus-ring'
                placeholder='{ "type": "service_account", ... }'
                value={serviceAccountJson}
                onChange={(event) => setServiceAccountJson(event.currentTarget.value)}
              />
            </label>
            <ValidationMessage validation={validation} />
          </TabsContent>
          <TabsContent value='emulator' className='grid gap-3 pt-3'>
            <label className='grid gap-1.5'>
              <span className='text-xs font-semibold text-text-secondary'>Display name</span>
              <Input
                aria-label='Display name'
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </label>
            <label className='grid gap-1.5'>
              <span className='text-xs font-semibold text-text-secondary'>Firebase project id</span>
              <Input
                aria-label='Firebase project id'
                value={projectId}
                onChange={(event) => setProjectId(event.currentTarget.value)}
              />
            </label>
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
          </TabsContent>
        </Tabs>
        {error ? <InlineAlert variant='danger'>{error}</InlineAlert> : null}
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!canSubmit || isSaving} variant='primary' onClick={handleSubmit}>
            <Plus size={14} aria-hidden='true' /> {isSaving ? 'Adding' : 'Add account'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ValidationMessage(
  { validation }: { readonly validation: ServiceAccountValidationResult | null; },
) {
  if (!validation) return null;
  if (validation.ok) {
    return <InlineAlert variant='success'>Service account JSON is valid.</InlineAlert>;
  }
  return (
    <InlineAlert variant='danger'>
      {(validation.errors ?? ['Invalid service account JSON.']).join(' ')}
    </InlineAlert>
  );
}

async function validateServiceAccount(
  projects: ProjectsRepository,
  json: string,
): Promise<ServiceAccountValidationResult> {
  if (projects.validateServiceAccount) return await projects.validateServiceAccount(json);
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const projectId = typeof parsed['project_id'] === 'string' ? parsed['project_id'] : '';
    const clientEmail = typeof parsed['client_email'] === 'string' ? parsed['client_email'] : '';
    if (!projectId || !clientEmail) {
      return { ok: false, errors: ['Missing project_id or client_email.'] };
    }
    return { ok: true, summary: { type: 'service_account', projectId, clientEmail } };
  } catch {
    return { ok: false, errors: ['Service account file is not valid JSON.'] };
  }
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
