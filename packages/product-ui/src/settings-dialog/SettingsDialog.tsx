import { type AppearanceMode, type DensityName } from '@firebase-desk/design-tokens';
import type { SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { Button, Dialog, DialogContent } from '@firebase-desk/ui';
import { useEffect, useState } from 'react';
import { useAppearance } from '../appearance/AppearanceProvider.tsx';

export interface SettingsDialogProps {
  readonly density?: DensityName;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDensityChange?: (density: DensityName) => void;
  readonly open: boolean;
}

const modes: ReadonlyArray<AppearanceMode> = ['system', 'light', 'dark'];
const densities: ReadonlyArray<DensityName> = ['compact', 'comfortable'];

export function SettingsDialog(
  { density, onDensityChange, onOpenChange, open }: SettingsDialogProps,
) {
  const appearance = useAppearance();
  const [settingsSnapshot, setSettingsSnapshot] = useState<SettingsSnapshot | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    appearance.settings.load().then((snapshot) => {
      if (!cancelled) setSettingsSnapshot(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [appearance.settings, appearance.mode, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        description='Configure Firebase Desk preferences and app info.'
        title='Settings'
      >
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
        {density && onDensityChange
          ? (
            <div className='grid gap-2'>
              <div className='text-sm font-medium text-text-primary'>Density</div>
              <div className='flex gap-1'>
                {densities.map((densityName) => (
                  <Button
                    key={densityName}
                    aria-label={`${densityName} density`}
                    data-state={density === densityName ? 'active' : 'inactive'}
                    variant={density === densityName ? 'primary' : 'secondary'}
                    onClick={() => onDensityChange(densityName)}
                  >
                    {densityName}
                  </Button>
                ))}
              </div>
            </div>
          )
          : null}
        <SettingsSummary snapshot={settingsSnapshot} />
        <div className='grid gap-1 rounded-md border border-border-subtle bg-bg-subtle p-3 text-sm'>
          <div className='font-medium text-text-primary'>Credential storage</div>
          <div className='text-text-secondary'>Mock mode only. No credentials are read.</div>
        </div>
        <div className='grid gap-1 rounded-md border border-border-subtle bg-bg-subtle p-3 text-sm'>
          <div className='font-medium text-text-primary'>Data safety</div>
          <div className='text-text-secondary'>
            Account and target stay explicit before Firebase writes are enabled.
          </div>
        </div>
        <div className='grid gap-1 rounded-md border border-border-subtle bg-bg-subtle p-3 text-sm'>
          <div className='font-medium text-text-primary'>About</div>
          <div className='text-text-secondary'>Firebase Desk, MIT license.</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsSummary({ snapshot }: { readonly snapshot: SettingsSnapshot | null; }) {
  if (!snapshot) {
    return (
      <div className='grid gap-1 rounded-md border border-border-subtle bg-bg-subtle p-3 text-sm'>
        <div className='font-medium text-text-primary'>Saved settings</div>
        <div className='text-text-secondary'>Loading</div>
      </div>
    );
  }
  return (
    <div className='grid gap-1 rounded-md border border-border-subtle bg-bg-subtle p-3 text-sm'>
      <div className='font-medium text-text-primary'>Saved settings</div>
      <SettingRow label='Sidebar' value={`${snapshot.sidebarWidth}px`} />
      <SettingRow label='Inspector' value={`${snapshot.inspectorWidth}px`} />
      <SettingRow
        label='Hotkeys'
        value={`${Object.keys(snapshot.hotkeyOverrides).length} overrides`}
      />
    </div>
  );
}

function SettingRow({ label, value }: { readonly label: string; readonly value: string; }) {
  return (
    <div className='flex items-center justify-between gap-3 text-sm'>
      <span className='text-text-muted'>{label}</span>
      <span className='font-mono text-xs text-text-secondary'>{value}</span>
    </div>
  );
}
