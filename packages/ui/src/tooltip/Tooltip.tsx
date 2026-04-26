import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { type ReactNode } from 'react';
import { cn } from '../cn.ts';

export interface TooltipProps {
  readonly children: ReactNode;
  readonly content: ReactNode;
  readonly delayDuration?: number;
  readonly side?: TooltipPrimitive.TooltipContentProps['side'];
}

export function Tooltip({ children, content, delayDuration = 300, side = 'top' }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={cn(
              'z-tooltip rounded-md border border-border bg-bg-elevated px-2 py-1 text-xs text-text-primary shadow-popover',
              'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
            )}
            side={side}
            sideOffset={6}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
