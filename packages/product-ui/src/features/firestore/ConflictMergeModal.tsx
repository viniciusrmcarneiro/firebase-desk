import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { Badge, Button, Dialog, DialogContent, InlineAlert, Tooltip } from '@firebase-desk/ui';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DiffCodeEditor } from '../../code-editor/CodeEditor.tsx';
import { parseDocumentJson, validateFirestoreDocumentData } from './fieldEditModel.ts';
import { stringifySortedJson } from './sortedJson.ts';

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
    () => stringifySortedJson(remoteDocument?.data ?? {}),
    [remoteDocument],
  );
  const localSource = useMemo(() => stringifySortedJson(localData), [localData]);
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
          <InlineAlert variant='warning'>
            <div className='flex items-start gap-2'>
              <AlertTriangle className='mt-0.5 shrink-0' size={16} aria-hidden='true' />
              <div className='grid gap-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium'>Remote document changed.</span>
                  <Tooltip content='Your save was stopped because the document update time changed.'>
                    <Badge variant='warning'>conflict</Badge>
                  </Tooltip>
                </div>
                <span>
                  Review the current remote document and edit the merge draft before saving.
                </span>
              </div>
            </div>
          </InlineAlert>
          {remoteDocument
            ? null
            : (
              <InlineAlert variant='warning'>
                The remote document no longer exists. The merge draft is editable.
              </InlineAlert>
            )}
          <div className='overflow-hidden rounded-md border border-border-subtle'>
            <div className='grid grid-cols-2 border-b border-border-subtle bg-bg-subtle text-sm'>
              <DiffPaneLabel label='Current remote' meta='read-only' />
              <DiffPaneLabel label='Merge draft' meta='editable' />
            </div>
            <div className='h-[min(520px,56vh)]'>
              <DiffCodeEditor
                language='json'
                modified={source}
                original={remoteSource}
                onModifiedChange={setSource}
              />
            </div>
          </div>
          {error ? <InlineAlert variant='danger'>{error}</InlineAlert> : null}
        </div>
        <div className='flex justify-end gap-2'>
          <Button disabled={isSaving} variant='ghost' onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={isSaving} variant='secondary' onClick={onRefresh}>
            Discard my changes
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

function DiffPaneLabel({ label, meta }: { readonly label: string; readonly meta: string; }) {
  return (
    <div className='flex min-w-0 items-center justify-between gap-2 border-r border-border-subtle px-3 py-2 last:border-r-0'>
      <span className='truncate font-medium text-text-primary'>{label}</span>
      <Badge>{meta}</Badge>
    </div>
  );
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
