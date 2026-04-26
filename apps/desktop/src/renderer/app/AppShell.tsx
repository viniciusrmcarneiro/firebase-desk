import type { DensityName } from '@firebase-desk/design-tokens';
import {
  AppShell as ProductAppShell,
  CommandPalette,
  ProductionWarning,
  SettingsDialog,
  SidebarShell,
  StatusBar,
  TabStrip,
  TargetModeBadge,
  useAppearance,
  WorkspaceShell,
} from '@firebase-desk/product-ui';
import { Badge, Button, Input, Panel, PanelBody, PanelHeader, Toolbar } from '@firebase-desk/ui';
import { useEffect, useState } from 'react';

const sidebarNodes = [
  { id: 'project', label: 'demo-admin' },
  { id: 'firestore', label: 'Firestore / users' },
  { id: 'auth', label: 'Authentication / active users' },
  { id: 'js', label: 'JavaScript Query / cleanup' },
] as const;

const tabs = [
  { id: 'firestore', label: 'Firestore' },
  { id: 'auth', label: 'Auth' },
  { id: 'js', label: 'JS Query' },
] as const;

export function AppShell() {
  const appearance = useAppearance();
  const [activeTabId, setActiveTabId] = useState('firestore');
  const [density, setDensity] = useState<DensityName>('compact');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  return (
    <>
      <ProductAppShell
        sidebar={
          <SidebarShell
            footer={
              <div className='grid gap-2'>
                <div className='flex gap-1'>
                  <Button
                    aria-label='System theme'
                    size='xs'
                    variant={appearance.mode === 'system' ? 'primary' : 'secondary'}
                    onClick={() => void appearance.setMode('system')}
                  >
                    System
                  </Button>
                  <Button
                    aria-label='Light theme'
                    size='xs'
                    variant={appearance.mode === 'light' ? 'primary' : 'secondary'}
                    onClick={() => void appearance.setMode('light')}
                  >
                    Light
                  </Button>
                  <Button
                    aria-label='Dark theme'
                    size='xs'
                    variant={appearance.mode === 'dark' ? 'primary' : 'secondary'}
                    onClick={() => void appearance.setMode('dark')}
                  >
                    Dark
                  </Button>
                </div>
                <div className='flex gap-1'>
                  <Button
                    aria-label='Compact density'
                    size='xs'
                    variant={density === 'compact' ? 'primary' : 'secondary'}
                    onClick={() => setDensity('compact')}
                  >
                    Compact
                  </Button>
                  <Button
                    aria-label='Comfortable density'
                    size='xs'
                    variant={density === 'comfortable' ? 'primary' : 'secondary'}
                    onClick={() => setDensity('comfortable')}
                  >
                    Comfort
                  </Button>
                </div>
              </div>
            }
            title='Firebase Desk'
          >
            <Input aria-label='Filter sidebar' placeholder='Filter tree' />
            <div className='mt-2 grid gap-1'>
              {sidebarNodes.map((node) => (
                <button
                  key={node.id}
                  className='rounded-md px-2 py-1 text-left text-sm text-text-secondary hover:bg-action-ghost-hover hover:text-text-primary'
                  type='button'
                >
                  {node.label}
                </button>
              ))}
            </div>
          </SidebarShell>
        }
        statusBar={
          <StatusBar
            left={
              <>
                <TargetModeBadge mode='emulator' />
                <span>demo-admin</span>
              </>
            }
            right={<span>{density}</span>}
          />
        }
        workspace={
          <WorkspaceShell
            tabStrip={
              <TabStrip activeTabId={activeTabId} tabs={tabs} onSelectTab={setActiveTabId} />
            }
            toolbar={
              <Toolbar aria-label='Workspace toolbar'>
                <Button variant='primary'>Run Query</Button>
                <Button variant='ghost' onClick={() => setSettingsOpen(true)}>Settings</Button>
                <Badge variant='emulator'>Emulator</Badge>
              </Toolbar>
            }
          >
            <div className='grid h-full min-h-0 grid-cols-[minmax(0,1fr)_var(--inspector-width,360px)] gap-2 p-2'>
              <Panel className='grid min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
                <PanelHeader>
                  {activeTabId === 'firestore'
                    ? 'Firestore Query'
                    : activeTabId === 'auth'
                    ? 'Authentication Users'
                    : 'JavaScript Query'}
                </PanelHeader>
                <PanelBody>
                  <div className='grid gap-3 text-sm text-text-secondary'>
                    <ProductionWarning actionLabel='Demo is wired to emulator target; production warning component shown for safety states.' />
                    <div className='rounded-md border border-border-subtle bg-bg-subtle p-3 font-mono text-xs'>
                      {activeTabId === 'firestore'
                        ? '/accounts/demo/users limit 25'
                        : activeTabId === 'auth'
                        ? 'auth.users.where(disabled == false)'
                        : 'await db.collection("users").limit(5).get()'}
                    </div>
                    <div className='grid grid-cols-3 gap-2'>
                      <PlaceholderPanel title='Firestore' value='24 docs' />
                      <PlaceholderPanel title='Auth' value='8 users' />
                      <PlaceholderPanel title='JS Query' value='ready' />
                    </div>
                  </div>
                </PanelBody>
              </Panel>
              <Panel className='grid min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
                <PanelHeader>Inspector</PanelHeader>
                <PanelBody>
                  <div className='grid gap-2 text-sm text-text-secondary'>
                    <div>Theme: {appearance.resolvedTheme}</div>
                    <div>Density: {density}</div>
                    <div>Target: Emulator</div>
                  </div>
                </PanelBody>
              </Panel>
            </div>
          </WorkspaceShell>
        }
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CommandPalette
        commands={[{
          id: 'settings',
          label: 'Open Settings',
          onSelect: () => setSettingsOpen(true),
        }]}
      />
    </>
  );
}

interface PlaceholderPanelProps {
  readonly title: string;
  readonly value: string;
}

function PlaceholderPanel({ title, value }: PlaceholderPanelProps) {
  return (
    <div className='rounded-md border border-border-subtle bg-bg-panel p-3'>
      <div className='text-xs text-text-muted'>{title}</div>
      <div className='pt-1 text-sm font-semibold text-text-primary'>{value}</div>
    </div>
  );
}
