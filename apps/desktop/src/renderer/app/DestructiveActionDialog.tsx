import { Button, Dialog, DialogContent } from '@firebase-desk/ui';
import type { DestructiveAction } from './hooks/useDestructiveActionController.ts';

interface DestructiveActionDialogProps {
  readonly action: DestructiveAction | null;
  readonly onOpenChange: (open: boolean) => void;
}

export function DestructiveActionDialog(
  { action, onOpenChange }: DestructiveActionDialogProps,
) {
  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent
        description={action?.description ?? null}
        title={action?.title ?? 'Confirm destructive action'}
      >
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant='danger'
            onClick={() => {
              action?.onConfirm();
              onOpenChange(false);
            }}
          >
            {action?.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
