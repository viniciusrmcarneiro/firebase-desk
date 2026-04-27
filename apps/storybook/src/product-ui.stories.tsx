import { type DensityName } from '@firebase-desk/design-tokens';
import { HotkeysProvider } from '@firebase-desk/hotkeys';
import {
  AppearanceProvider,
  AppShell,
  CodeEditor,
  CommandPalette,
  ProductionWarning,
  SettingsDialog,
  SidebarShell,
  StatusBar,
  TabStrip,
  TargetModeBadge,
  WorkspaceShell,
} from '@firebase-desk/product-ui';
import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { Button, Panel, PanelBody, PanelHeader, Toolbar } from '@firebase-desk/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

const settings = new MockSettingsRepository();

const meta: Meta = {
  title: 'Product UI/Foundation',
  decorators: [
    (Story) => (
      <HotkeysProvider settings={settings}>
        <AppearanceProvider settings={settings}>
          <Story />
        </AppearanceProvider>
      </HotkeysProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj;

export const AppShellDefault: Story = {
  render: () => (
    <div className='h-105 [--sidebar-width:240px]'>
      <AppShell
        sidebar={<SidebarShell title='Firebase Desk'>Project tree</SidebarShell>}
        statusBar={<StatusBar left='Connected' right={<TargetModeBadge mode='emulator' />} />}
        workspace={
          <WorkspaceShell
            tabStrip={
              <TabStrip activeTabId='firestore' tabs={[{ id: 'firestore', label: 'Firestore' }]} />
            }
          >
            Workspace
          </WorkspaceShell>
        }
      />
    </div>
  ),
};
export const SidebarShellDefault: Story = {
  render: () => <SidebarShell title='Firebase Desk'>Tree</SidebarShell>,
};
export const WorkspaceShellDefault: Story = {
  render: () => (
    <WorkspaceShell
      tabStrip={<TabStrip activeTabId='auth' tabs={[{ id: 'auth', label: 'Auth' }]} />}
    >
      Users
    </WorkspaceShell>
  ),
};
export const TabStripDefault: Story = {
  render: () => (
    <TabStrip
      activeTabId='js'
      tabs={[{ id: 'firestore', label: 'Firestore' }, { id: 'js', label: 'JS Query' }]}
    />
  ),
};
export const StatusBarDefault: Story = {
  render: () => <StatusBar left='Local emulator' right={<TargetModeBadge mode='emulator' />} />,
};
export const TargetModeBadgeProduction: Story = {
  render: () => <TargetModeBadge mode='production' />,
};
export const TargetModeBadgeEmulator: Story = { render: () => <TargetModeBadge mode='emulator' /> };
export const ProductionWarningDefault: Story = { render: () => <ProductionWarning /> };
export const SettingsDialogOpen: Story = {
  render: () => <SettingsDialogStory />,
};

function SettingsDialogStory() {
  const [density, setDensity] = useState<DensityName>('compact');
  return (
    <SettingsDialog
      density={density}
      open
      onDensityChange={setDensity}
      onOpenChange={() => {}}
    />
  );
}
export const CommandPaletteOpen: Story = {
  render: () => (
    <CommandPalette
      commands={[{ id: 'settings', label: 'Open Settings', onSelect: () => {} }]}
      defaultOpen
    />
  ),
};
export const CodeEditorJson: Story = {
  render: () => (
    <div className='h-64'>
      <CodeEditor language='json' value={'{\n  "status": "ok"\n}'} />
    </div>
  ),
};
export const DemoWorkspacePanel: Story = {
  render: () => (
    <Panel className='w-130'>
      <PanelHeader actions={<Button variant='primary'>Run</Button>}>Firestore Query</PanelHeader>
      <Toolbar aria-label='Panel tools'>/projects/demo/users</Toolbar>
      <PanelBody>Placeholder data surface</PanelBody>
    </Panel>
  ),
};
