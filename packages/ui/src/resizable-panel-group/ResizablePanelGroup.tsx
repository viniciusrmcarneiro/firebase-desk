import { type ComponentProps } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { cn } from '../cn.ts';

type GroupOrientation = ComponentProps<typeof Group>['orientation'];

export interface ResizablePanelGroupProps
  extends Omit<ComponentProps<typeof Group>, 'orientation'>
{
  readonly direction?: GroupOrientation;
  readonly orientation?: GroupOrientation;
}

export type ResizablePanelProps = ComponentProps<typeof Panel>;
export type ResizablePanelHandleProps = ComponentProps<typeof Separator>;

export function ResizablePanelGroup(
  { className, direction, orientation, ...props }: ResizablePanelGroupProps,
) {
  return (
    <Group
      className={cn('min-h-0 min-w-0', className)}
      orientation={orientation ?? direction}
      {...props}
    />
  );
}

export function ResizablePanel({ className, ...props }: ResizablePanelProps) {
  return <Panel className={cn('min-h-0 min-w-0', className)} {...props} />;
}

export function ResizableHandle({ className, ...props }: ResizablePanelHandleProps) {
  return (
    <Separator
      className={cn(
        'bg-border-subtle transition-colors duration-fast ease-standard hover:bg-border-strong data-[resize-handle-active]:bg-action-primary',
        className,
      )}
      {...props}
    />
  );
}
