import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { Button, Dialog, DialogContent, InlineAlert } from '@firebase-desk/ui';
import { useEffect, useMemo, useState } from 'react';
import { DiffCodeEditor } from '../../code-editor/CodeEditor.tsx';
import { parseDocumentJson, validateFirestoreDocumentData } from './fieldEditModel.ts';

export interface ConflictMergeModalProps {
  readonly documentPath: string;
  readonly localData: Record<string, unknown>;
  readonly onCancel: () => void;
  readonly onRefresh: () => void;
  readonly onSaveMerged: (data: Record<string, unknown>) => Promise<void> | void;
  readonly open: boolean;
  readonly remoteDocument: FirestoreDocumentResult | null;
}

export function ConflictMergeModal(
  {
    documentPath,
    localData,
    onCancel,
    onRefresh,
    onSaveMerged,
    open,
    remoteDocument,
  }: ConflictMergeModalProps,
) {
  const remoteSource = useMemo(
    () => JSON.stringify(remoteDocument?.data ?? {}, null, 2),
    [remoteDocument],
  );
  const localSource = useMemo(() => JSON.stringify(localData, null, 2), [localData]);
  const [source, setSource] = useState(localSource);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSource(localSource);
    setError(null);
    setIsSaving(false);
  }, [localSource, open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent
        className='w-[min(1100px,calc(100vw-32px))]'
        description={remoteDocument?.updateTime
          ? `${documentPath} changed at ${remoteDocument.updateTime}`
          : `${documentPath} changed remotely`}
        title='Resolve save conflict'
      >
        <div className='grid gap-3'>
          {remoteDocument
            ? null
            : (
              <InlineAlert variant='warning'>
                The remote document no longer exists. The merge draft is editable.
              </InlineAlert>
            )}
          <div className='h-[min(560px,62vh)] overflow-hidden rounded-md border border-border-subtle'>
            <DiffCodeEditor
              language='json'
              modified={source}
              original={remoteSource}
              onModifiedChange={setSource}
            />
          </div>
          {error ? <InlineAlert variant='danger'>{error}</InlineAlert> : null}
        </div>
        <div className='flex justify-end gap-2'>
          <Button disabled={isSaving} variant='ghost' onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={isSaving} variant='secondary' onClick={onRefresh}>
            Refresh
          </Button>
          <Button
            disabled={isSaving || !remoteDocument?.updateTime}
            variant='primary'
            onClick={async () => {
              setIsSaving(true);
              setError(null);
              try {
                const data = parseDocumentJson(source);
                validateFirestoreDocumentData(data);
                await onSaveMerged(data);
              } catch (caught) {
                setError(messageFromError(caught, 'Could not save merged document.'));
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {isSaving ? 'Saving' : 'Save merged'}
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
