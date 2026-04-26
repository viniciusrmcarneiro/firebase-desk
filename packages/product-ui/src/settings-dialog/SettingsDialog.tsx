import { type AppearanceMode } from '@firebase-desk/design-tokens';
import { Button, Dialog, DialogContent } from '@firebase-desk/ui';
import { useAppearance } from '../appearance/AppearanceProvider.tsx';

export interface SettingsDialogProps {
  readonly onOpenChange?: (open: boolean) => void;
  readonly open: boolean;
}

const modes: ReadonlyArray<AppearanceMode> = ['system', 'light', 'dark'];

export function SettingsDialog({ onOpenChange, open }: SettingsDialogProps) {
  const appearance = useAppearance();
  const dialogProps = onOpenChange ? { onOpenChange } : {};

  return (
    <Dialog open={open} {...dialogProps}>
      <DialogContent description='Configure Firebase Desk appearance.' title='Settings'>
        <div className='grid gap-2'>
          <div className='text-sm font-medium text-text-primary'>Appearance</div>
          <div className='flex gap-1'>
            {modes.map((mode) => (
              <Button
                key={mode}
                data-state={appearance.mode === mode ? 'active' : 'inactive'}
                variant={appearance.mode === mode ? 'primary' : 'secondary'}
                onClick={() => void appearance.setMode(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
