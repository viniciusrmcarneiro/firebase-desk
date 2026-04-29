import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { Button, Dialog, DialogContent, InlineAlert } from '@firebase-desk/ui';
import { useEffect, useState } from 'react';
import { CodeEditor } from '../../code-editor/CodeEditor.tsx';
import { parseDocumentJson, validateFirestoreDocumentData } from './fieldEditModel.ts';

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
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setSource(JSON.stringify(document.data, null, 2));
      setError(null);
      setIsSaving(false);
    }
  }, [document]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='w-[min(760px,calc(100vw-32px))]'
        description={document?.path ?? null}
        title='Edit document JSON'
      >
        <div className='grid max-h-[68vh] min-h-0 grid-rows-[minmax(280px,1fr)] gap-2'>
          <div className='overflow-hidden rounded-md border border-border-subtle'>
            <CodeEditor
              language='json'
              value={source}
              onChange={setSource}
            />
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
                const data = parseDocumentJson(source);
                validateFirestoreDocumentData(data);
                await onSaveDocument?.(document.path, data);
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

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
