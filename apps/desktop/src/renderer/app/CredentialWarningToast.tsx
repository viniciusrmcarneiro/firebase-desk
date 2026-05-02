import { IconButton, InlineAlert } from '@firebase-desk/ui';
import { X } from 'lucide-react';

interface CredentialWarningToastProps {
  readonly message: string | null;
  readonly onDismiss: () => void;
}

export function CredentialWarningToast({ message, onDismiss }: CredentialWarningToastProps) {
  if (!message) return null;
  return (
    <div className='pointer-events-none absolute left-1/2 top-12 z-popover w-[min(560px,calc(100%-24px))] -translate-x-1/2'>
      <InlineAlert
        variant='warning'
        className='pointer-events-auto flex items-center justify-between gap-3'
      >
        <span>{message}</span>
        <IconButton
          icon={<X size={14} aria-hidden='true' />}
          label='Dismiss credential warning'
          size='xs'
          variant='ghost'
          onClick={onDismiss}
        />
      </InlineAlert>
    </div>
  );
}
