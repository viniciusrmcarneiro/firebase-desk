import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { Button, Dialog, DialogContent, InlineAlert, Input } from '@firebase-desk/ui';
import { useEffect, useState } from 'react';
import { CodeEditor } from '../../code-editor/CodeEditor.tsx';
import { formatFirestoreValue } from './FirestoreValueCell.tsx';

export interface DocumentEditorModalProps {
  readonly document: FirestoreDocumentResult | null;
  readonly onSaveDocument?:
    | ((documentPath: string, data: Record<string, unknown>) => Promise<void> | void)
    | undefined;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export function DocumentEditorModal(
  { document, onSaveDocument, onOpenChange, open }: DocumentEditorModalProps,
) {
  const [source, setSource] = useState('{}');
  const [fieldName, setFieldName] = useState('newField');
  const [fieldValue, setFieldValue] = useState('"value"');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setSource(JSON.stringify(document.data, null, 2));
      setError(null);
      setIsSaving(false);
    }
  }, [document]);

  const fields = document ? Object.entries(document.data) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='w-[min(760px,calc(100vw-32px))]'
        description={document?.path ?? null}
        title='Document editor'
      >
        <div className='grid max-h-[68vh] min-h-0 grid-rows-[minmax(180px,1fr)_auto] gap-2'>
          <div className='overflow-hidden rounded-md border border-border-subtle'>
            <CodeEditor
              language='json'
              value={source}
              onChange={setSource}
            />
          </div>
          <div className='grid gap-2 rounded-md border border-border-subtle bg-bg-subtle p-2'>
            <div className='grid max-h-36 gap-1 overflow-auto'>
              {fields.map(([key, value]) => (
                <div
                  key={key}
                  className='grid grid-cols-[minmax(96px,0.5fr)_minmax(0,1fr)] gap-2 text-xs'
                >
                  <code className='truncate text-text-primary'>{key}</code>
                  <Input
                    aria-label={`Edit ${key}`}
                    className='font-mono'
                    value={formatFirestoreValue(value)}
                    onChange={() => {}}
                  />
                </div>
              ))}
            </div>
            <div className='grid grid-cols-[minmax(96px,0.5fr)_minmax(0,1fr)_auto] gap-2'>
              <Input
                aria-label='New field name'
                value={fieldName}
                onChange={(event) => setFieldName(event.currentTarget.value)}
              />
              <Input
                aria-label='New field value'
                className='font-mono'
                value={fieldValue}
                onChange={(event) => setFieldValue(event.currentTarget.value)}
              />
              <Button
                variant='secondary'
                onClick={() => {
                  try {
                    const parsed = parseEditorJson(source);
                    setSource(
                      JSON.stringify(
                        { ...parsed, [fieldName]: parseEditorValue(fieldValue) },
                        null,
                        2,
                      ),
                    );
                    setError(null);
                  } catch (caught) {
                    setError(messageFromError(caught, 'Could not add field.'));
                  }
                }}
              >
                Add field
              </Button>
            </div>
          </div>
        </div>
        {error ? <InlineAlert variant='danger'>{error}</InlineAlert> : null}
        <div className='flex justify-end gap-2'>
          <Button disabled={isSaving} variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSaving}
            variant='primary'
            onClick={async () => {
              if (!document) return;
              setIsSaving(true);
              setError(null);
              try {
                await onSaveDocument?.(document.path, parseEditorJson(source));
                onOpenChange(false);
              } catch (caught) {
                setError(messageFromError(caught, 'Could not save document.'));
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {isSaving ? 'Saving' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseEditorJson(source: string): Record<string, unknown> {
  const value = JSON.parse(source) as unknown;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error('Document JSON must be an object.');
}

function parseEditorValue(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
