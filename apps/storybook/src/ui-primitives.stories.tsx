import {
  Badge,
  Button,
  ContextMenu,
  ContextMenuTrigger,
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  InlineAlert,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toolbar,
  Tooltip,
} from '@firebase-desk/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { Play, Settings } from 'lucide-react';

const meta: Meta = {
  title: 'UI/Primitives',
};

export default meta;

type Story = StoryObj;

export const ButtonPrimary: Story = { render: () => <Button variant='primary'>Run Query</Button> };
export const ButtonSecondary: Story = { render: () => <Button variant='secondary'>Save</Button> };
export const ButtonGhost: Story = { render: () => <Button variant='ghost'>Cancel</Button> };
export const ButtonDanger: Story = { render: () => <Button variant='danger'>Delete</Button> };
export const ButtonWarning: Story = { render: () => <Button variant='warning'>Mutate</Button> };
export const IconButtonDefault: Story = {
  render: () => <IconButton icon={<Settings size={16} aria-hidden='true' />} label='Settings' />,
};
export const InputCompact: Story = {
  render: () => <Input aria-label='Path' placeholder='accounts/{id}/users' />,
};
export const InputComfortable: Story = {
  render: () => <Input aria-label='Path' density='comfortable' placeholder='accounts/{id}/users' />,
};
export const BadgeNeutral: Story = { render: () => <Badge>Neutral</Badge> };
export const BadgeSuccess: Story = { render: () => <Badge variant='success'>Success</Badge> };
export const BadgeWarning: Story = { render: () => <Badge variant='warning'>Warning</Badge> };
export const BadgeDanger: Story = { render: () => <Badge variant='danger'>Danger</Badge> };
export const BadgeProduction: Story = {
  render: () => <Badge variant='production'>Production</Badge>,
};
export const BadgeEmulator: Story = { render: () => <Badge variant='emulator'>Emulator</Badge> };
export const StatusBadgeSuccess: Story = { render: () => <StatusBadge status='success' /> };
export const StatusBadgeProduction: Story = { render: () => <StatusBadge status='production' /> };
export const TooltipDefault: Story = {
  render: () => (
    <Tooltip content='Run the current query'>
      <Button>
        <Play size={14} aria-hidden='true' /> Run
      </Button>
    </Tooltip>
  ),
};
export const DialogOpen: Story = {
  render: () => (
    <Dialog open>
      <DialogContent title='Settings' description='Runtime shell preferences'>
        Dialog content
      </DialogContent>
    </Dialog>
  ),
};
export const DropdownMenuOpen: Story = {
  render: () => (
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <Button>Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Close tab</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
export const ContextMenuTriggerOnly: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='block rounded-md border border-border p-3'>
        Right click row
      </ContextMenuTrigger>
    </ContextMenu>
  ),
};
export const TabsDefault: Story = {
  render: () => (
    <Tabs defaultValue='firestore'>
      <TabsList>
        <TabsTrigger value='firestore'>Firestore</TabsTrigger>
        <TabsTrigger value='auth'>Auth</TabsTrigger>
      </TabsList>
      <TabsContent className='p-3' value='firestore'>Collections</TabsContent>
      <TabsContent className='p-3' value='auth'>Users</TabsContent>
    </Tabs>
  ),
};
export const PanelDefault: Story = {
  render: () => (
    <Panel className='w-96'>
      <PanelHeader actions={<Button>Run</Button>}>Query</PanelHeader>
      <PanelBody>Panel body</PanelBody>
    </Panel>
  ),
};
export const ToolbarDefault: Story = {
  render: () => (
    <Toolbar aria-label='Query toolbar'>
      <Button variant='primary'>Run</Button>
      <Button variant='ghost'>Format</Button>
    </Toolbar>
  ),
};
export const EmptyStateDefault: Story = {
  render: () => (
    <EmptyState
      action={<Button>Add project</Button>}
      description='Connect a Firebase project.'
      title='No project selected'
    />
  ),
};
export const InlineAlertInfo: Story = {
  render: () => <InlineAlert>Emulator connected.</InlineAlert>,
};
export const InlineAlertSuccess: Story = {
  render: () => <InlineAlert variant='success'>Query complete.</InlineAlert>,
};
export const InlineAlertWarning: Story = {
  render: () => <InlineAlert variant='warning'>Rules not loaded.</InlineAlert>,
};
export const InlineAlertDanger: Story = {
  render: () => <InlineAlert variant='danger'>Production mutation.</InlineAlert>,
};
export const ResizablePanelGroupDefault: Story = {
  render: () => (
    <ResizablePanelGroup
      className='h-48 w-[520px] rounded-md border border-border'
      direction='horizontal'
    >
      <ResizablePanel defaultSize={35} className='p-3'>Sidebar</ResizablePanel>
      <ResizableHandle className='w-px' />
      <ResizablePanel defaultSize={65} className='p-3'>Workspace</ResizablePanel>
    </ResizablePanelGroup>
  ),
};
