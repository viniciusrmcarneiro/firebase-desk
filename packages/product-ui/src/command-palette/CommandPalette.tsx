import { useHotkey } from '@firebase-desk/hotkeys';
import { Dialog, DialogContent } from '@firebase-desk/ui';
import { Command } from 'cmdk';
import { useState } from 'react';

export interface CommandPaletteItem {
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void;
}

export interface CommandPaletteProps {
  readonly commands: ReadonlyArray<CommandPaletteItem>;
  readonly defaultOpen?: boolean;
}

export function CommandPalette({ commands, defaultOpen = false }: CommandPaletteProps) {
  const [open, setOpen] = useState(defaultOpen);

  useHotkey('tree.focusFilter', (event) => {
    event.preventDefault();
    setOpen(true);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className='w-[min(640px,calc(100vw-32px))] overflow-hidden'
        description='Search and run Firebase Desk commands.'
        title='Command palette'
      >
        <Command
          className='overflow-hidden rounded-md border border-border-subtle bg-bg-elevated text-text-primary'
          label='Command palette'
        >
          <Command.Input
            className='h-11 w-full border-b border-border-subtle bg-transparent px-3 text-sm outline-none placeholder:text-text-muted'
            placeholder='Search commands'
          />
          <Command.List className='max-h-80 overflow-auto p-1'>
            <Command.Empty className='px-2 py-6 text-center text-sm text-text-muted'>
              No commands found
            </Command.Empty>
            {commands.map((command) => (
              <Command.Item
                key={command.id}
                className='flex h-8 cursor-default items-center rounded-sm px-2 text-sm data-[selected=true]:bg-action-selected'
                value={command.label}
                onSelect={command.onSelect}
              >
                {command.label}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
