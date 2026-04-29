import { Button, Dialog, DialogContent, InlineAlert, Input } from '@firebase-desk/ui';
import { useEffect, useRef, useState } from 'react';
import { CodeEditor } from '../../code-editor/CodeEditor.tsx';
import { parseDocumentJson, validateFirestoreDocumentData } from './fieldEditModel.ts';

export interface CreateDocumentModalProps {
  readonly collectionPath: string | null;
  readonly onCreateDocument: (
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ) => Promise<void> | void;
  readonly onGenerateDocumentId: (collectionPath: string) => Promise<string> | string;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export function CreateDocumentModal(
  {
    collectionPath,
    onCreateDocument,
    onGenerateDocumentId,
    onOpenChange,
    open,
  }: CreateDocumentModalProps,
) {
  const [documentId, setDocumentId] = useState('');
  const [source, setSource] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const idTouched = useRef(false);

  useEffect(() => {
    if (!open || !collectionPath) return;
    let cancelled = false;
    idTouched.current = false;
    setDocumentId('');
    setSource('{}');
    setError(null);
    setIsSaving(false);
    setIsGeneratingId(true);
    Promise.resolve(onGenerateDocumentId(collectionPath))
      .then((generatedId) => {
        if (!cancelled && !idTouched.current) setDocumentId(generatedId);
      })
      .catch((caught) => {
        if (!cancelled) setError(messageFromError(caught, 'Could not generate document ID.'));
      })
      .finally(() => {
        if (!cancelled) setIsGeneratingId(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionPath, onGenerateDocumentId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='w-[min(760px,calc(100vw-32px))]'
        description={collectionPath}
        title='New document'
      >
        <div className='grid gap-3'>
          <label className='grid gap-1 text-sm font-medium text-text-secondary'>
            Document ID
            <Input
              aria-label='Document ID'
              className='font-mono'
              disabled={isSaving}
              placeholder={isGeneratingId ? 'Generating' : 'document ID'}
              value={documentId}
              onChange={(event) => {
                idTouched.current = true;
                setDocumentId(event.currentTarget.value);
                setError(null);
              }}
            />
          </label>
          <div className='grid gap-1'>
            <div className='text-xs font-semibold text-text-secondary'>Document JSON</div>
            <div className='h-64 overflow-hidden rounded-md border border-border-subtle'>
              <CodeEditor
                ariaLabel='New document JSON'
                language='json'
                value={source}
                onChange={setSource}
              />
            </div>
          </div>
          {error ? <InlineAlert variant='danger'>{error}</InlineAlert> : null}
        </div>
        <div className='flex justify-end gap-2'>
          <Button disabled={isSaving} variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSaving || isGeneratingId}
            variant='primary'
            onClick={async () => {
              if (!collectionPath) return;
              setIsSaving(true);
              setError(null);
              try {
                const trimmedId = documentId.trim();
                validateDocumentId(trimmedId);
                const data = parseDocumentJson(source);
                validateFirestoreDocumentData(data);
                await onCreateDocument(collectionPath, trimmedId, data);
                onOpenChange(false);
              } catch (caught) {
                setError(messageFromError(caught, 'Could not create document.'));
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {isSaving ? 'Creating' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function validateDocumentId(documentId: string): void {
  if (!documentId) throw new Error('Document ID is required.');
  if (documentId.includes('/')) throw new Error('Document ID cannot contain /.');
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
