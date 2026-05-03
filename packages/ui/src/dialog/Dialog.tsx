import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef, type ReactNode } from 'react';
import { cn } from '../cn.ts';
import { IconButton } from '../icon-button/IconButton.tsx';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export interface DialogContentProps
  extends Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'title'>
{
  readonly description?: ReactNode;
  readonly stickyHeader?: boolean;
  readonly title: ReactNode;
}

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  ({ children, className, description, stickyHeader = false, title, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className='fixed inset-0 z-overlay bg-bg-overlay' />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-dialog grid max-h-[85vh] w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-3 overflow-auto rounded-lg border border-border bg-bg-elevated p-4 text-text-primary shadow-modal',
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'flex items-start justify-between gap-3',
            stickyHeader
              && 'sticky -top-4 z-10 -mx-4 -mt-4 border-b border-border bg-bg-elevated px-4 py-4',
          )}
        >
          <div className='grid gap-1'>
            <DialogPrimitive.Title className='text-base font-semibold text-text-primary'>
              {title}
            </DialogPrimitive.Title>
            {description
              ? (
                <DialogPrimitive.Description className='text-sm text-text-secondary'>
                  {description}
                </DialogPrimitive.Description>
              )
              : null}
          </div>
          <DialogPrimitive.Close asChild>
            <IconButton
              icon={<X size={16} aria-hidden='true' />}
              label='Close dialog'
              variant='ghost'
            />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
);

DialogContent.displayName = 'DialogContent';
