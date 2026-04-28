import { Button, Dialog, DialogContent } from '@firebase-desk/ui';
import { type ReactNode } from 'react';

export interface ConfirmDialogProps {
  readonly confirmLabel?: string;
  readonly description?: ReactNode;
  readonly onConfirm?: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}

export function ConfirmDialog(
  { confirmLabel = 'Confirm', description, onConfirm, onOpenChange, open, title }:
    ConfirmDialogProps,
) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent description={description} title={title}>
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant='danger'
            onClick={() => {
              onConfirm?.();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
