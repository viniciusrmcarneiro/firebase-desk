import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { Button, Dialog, DialogContent, InlineAlert } from '@firebase-desk/ui';
import { useEffect, useMemo, useState } from 'react';
import { messageFromError } from '../../shared/errors.ts';
import { buildDeleteDocumentOptions, type DeleteDocumentOptions } from './deleteDocumentModel.ts';

export interface DeleteDocumentDialogProps {
  readonly document: FirestoreDocumentResult | null;
  readonly onConfirm: (
    documentPath: string,
    options: DeleteDocumentOptions,
  ) => Promise<void> | void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export function DeleteDocumentDialog(
  { document, onConfirm, onOpenChange, open }: DeleteDocumentDialogProps,
) {
  const [selectedSubcollectionPaths, setSelectedSubcollectionPaths] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const subcollections = document?.subcollections ?? [];
  const options = useMemo(
    () =>
      document
        ? buildDeleteDocumentOptions(document, selectedSubcollectionPaths)
        : { deleteSubcollectionPaths: [], deleteDescendantDocumentPaths: [] },
    [document, selectedSubcollectionPaths],
  );

  useEffect(() => {
    if (!open) {
      setSelectedSubcollectionPaths(new Set());
      setError(null);
      setIsDeleting(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        description={document ? document.path : 'Delete the selected document?'}
        title='Delete document'
      >
        <div className='grid gap-3 text-sm'>
          <p className='text-text-secondary'>Delete this document?</p>
          {document?.hasSubcollections && subcollections.length === 0
            ? (
              <div className='rounded-md border border-border-subtle bg-bg-subtle p-2 text-xs text-text-muted'>
                This document has subcollections, but they are not loaded in this view.
              </div>
            )
            : null}
          {subcollections.length
            ? (
              <div className='grid gap-2 rounded-md border border-border-subtle p-2'>
                <div className='text-xs font-semibold text-text-secondary'>Subcollections</div>
                {subcollections.map((collection) => {
                  return (
                    <label
                      key={collection.path}
                      className='grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-sm px-1 py-1 hover:bg-action-ghost-hover'
                    >
                      <input
                        checked={selectedSubcollectionPaths.has(collection.path)}
                        type='checkbox'
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setSelectedSubcollectionPaths((current) => {
                            const next = new Set(current);
                            if (checked) next.add(collection.path);
                            else next.delete(collection.path);
                            return next;
                          });
                        }}
                      />
                      <span className='min-w-0 truncate'>
                        Delete subcollection <code>{collection.id}</code>
                      </span>
                    </label>
                  );
                })}
              </div>
            )
            : null}
          {error ? <InlineAlert variant='danger'>{error}</InlineAlert> : null}
        </div>
        <div className='flex justify-end gap-2'>
          <Button disabled={isDeleting} variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isDeleting}
            variant='danger'
            onClick={async () => {
              if (!document) return;
              setError(null);
              setIsDeleting(true);
              try {
                await onConfirm(document.path, options);
                onOpenChange(false);
              } catch (caught) {
                setError(messageFromError(caught, 'Could not delete document.'));
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? 'Deleting' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
