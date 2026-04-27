import { type AppearanceMode, type DensityName } from '@firebase-desk/design-tokens';
import type { DataMode, SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { Button, Dialog, DialogContent, InlineAlert } from '@firebase-desk/ui';
import { FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppearance } from '../appearance/AppearanceProvider.tsx';

export interface SettingsDialogProps {
  readonly dataDirectoryPath?: string | null | undefined;
  readonly density?: DensityName;
  readonly onOpenChange: (open: boolean) => void;
  readonly onOpenDataDirectory?: () => Promise<void>;
  readonly onDensityChange?: (density: DensityName) => void;
  readonly open: boolean;
}

const modes: ReadonlyArray<AppearanceMode> = ['system', 'light', 'dark'];
const dataModes: ReadonlyArray<DataMode> = ['live', 'mock'];
const densities: ReadonlyArray<DensityName> = ['compact', 'comfortable'];

export function SettingsDialog(
  {
    dataDirectoryPath,
    density,
    onDensityChange,
    onOpenChange,
    onOpenDataDirectory,
    open,
  }: SettingsDialogProps,
) {
  const appearance = useAppearance();
  const [settingsSnapshot, setSettingsSnapshot] = useState<SettingsSnapshot | null>(null);
  const [dataDirectoryError, setDataDirectoryError] = useState<string | null>(null);
  const [isOpeningDataDirectory, setIsOpeningDataDirectory] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingDataMode, setSavingDataMode] = useState<DataMode | null>(null);
  const dataDirectoryLabel = dataDirectoryPath === undefined
    ? 'Loading'
    : dataDirectoryPath ?? 'Unavailable';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDataDirectoryError(null);
    setSettingsError(null);
    appearance.settings.load()
      .then((snapshot) => {
        if (!cancelled) setSettingsSnapshot(snapshot);
      })
      .catch((caught) => {
        if (!cancelled) setSettingsError(messageFromError(caught, 'Could not load settings.'));
      });
    return () => {
      cancelled = true;
    };
  }, [appearance.settings, open]);

  async function handleDataModeChange(dataMode: DataMode) {
    setSettingsError(null);
    setSavingDataMode(dataMode);
    try {
      setSettingsSnapshot(await appearance.settings.save({ dataMode }));
    } catch (caught) {
      setSettingsError(messageFromError(caught, 'Could not save settings.'));
    } finally {
      setSavingDataMode(null);
    }
  }

  async function handleOpenDataDirectory() {
    if (!onOpenDataDirectory) return;
    setDataDirectoryError(null);
    setIsOpeningDataDirectory(true);
    try {
      await onOpenDataDirectory();
    } catch (caught) {
      setDataDirectoryError(messageFromError(caught, 'Could not open data location.'));
    } finally {
      setIsOpeningDataDirectory(false);
    }
  }

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
        {settingsSnapshot
          ? (
            <div className='grid gap-2'>
              <div className='text-sm font-medium text-text-primary'>Data source</div>
              <div className='flex gap-1'>
                {dataModes.map((dataMode) => (
                  <Button
                    key={dataMode}
                    aria-label={`${dataMode} data mode`}
                    data-state={settingsSnapshot.dataMode === dataMode ? 'active' : 'inactive'}
                    disabled={Boolean(savingDataMode)}
                    variant={settingsSnapshot.dataMode === dataMode ? 'primary' : 'secondary'}
                    onClick={() => void handleDataModeChange(dataMode)}
                  >
                    {savingDataMode === dataMode ? 'saving' : dataMode}
                  </Button>
                ))}
              </div>
              <div className='text-xs text-text-secondary'>Changes apply immediately.</div>
            </div>
          )
          : null}
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
        {settingsError ? <InlineAlert variant='danger'>{settingsError}</InlineAlert> : null}
        <SettingsSummary snapshot={settingsSnapshot} />
        {dataDirectoryPath !== undefined || onOpenDataDirectory
          ? (
            <div className='grid gap-2 rounded-md border border-border-subtle bg-bg-subtle p-3 text-sm'>
              <div className='font-medium text-text-primary'>Local data</div>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <code
                  aria-label='Data storage folder'
                  className='min-w-0 flex-1 break-all rounded border border-border-subtle bg-bg-panel px-2 py-1 font-mono text-xs text-text-secondary'
                  title={dataDirectoryPath ?? undefined}
                >
                  {dataDirectoryLabel}
                </code>
                <Button
                  disabled={!dataDirectoryPath || !onOpenDataDirectory || isOpeningDataDirectory}
                  variant='secondary'
                  onClick={() => void handleOpenDataDirectory()}
                >
                  <FolderOpen size={14} aria-hidden='true' />
                  {isOpeningDataDirectory ? 'Opening' : 'Open location'}
                </Button>
              </div>
              {dataDirectoryError
                ? <InlineAlert variant='danger'>{dataDirectoryError}</InlineAlert>
                : null}
            </div>
          )
          : null}
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

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
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
      <SettingRow label='Data source' value={snapshot.dataMode} />
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
