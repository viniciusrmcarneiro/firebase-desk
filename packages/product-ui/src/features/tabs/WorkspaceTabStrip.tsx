import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import {
  cn,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  IconButton,
} from '@firebase-desk/ui';
import { ArrowLeft, ArrowRight, Code2, Database, Folder, Trash2, Users, X } from 'lucide-react';
import { type ReactNode } from 'react';

export type WorkspaceTabKind = 'firestore-query' | 'auth-users' | 'js-query';

export interface WorkspaceTabModel {
  readonly id: string;
  readonly kind: WorkspaceTabKind;
  readonly title: string;
  readonly projectId: string;
  readonly canGoBack?: boolean;
  readonly canGoForward?: boolean;
}

export interface WorkspaceTabStripProps {
  readonly activeTabId: string;
  readonly projects: ReadonlyArray<ProjectSummary>;
  readonly tabs: ReadonlyArray<WorkspaceTabModel>;
  readonly onCloseAllTabs: () => void;
  readonly onCloseTab: (id: string) => void;
  readonly onCloseTabsToLeft: (id: string) => void;
  readonly onCloseTabsToRight: (id: string) => void;
  readonly onCloseOtherTabs: (id: string) => void;
  readonly onReorderTabs: (activeId: string, overId: string) => void;
  readonly onSelectTab: (id: string) => void;
  readonly onSortByProject: () => void;
}

export function WorkspaceTabStrip(
  {
    activeTabId,
    projects,
    tabs,
    onCloseAllTabs,
    onCloseTab,
    onCloseOtherTabs,
    onCloseTabsToLeft,
    onCloseTabsToRight,
    onReorderTabs,
    onSelectTab,
    onSortByProject,
  }: WorkspaceTabStripProps,
) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over && event.active.id !== event.over.id) {
      onReorderTabs(String(event.active.id), String(event.over.id));
    }
  };

  return (
    <div className='flex h-[var(--density-compact-tab-height)] min-w-0 items-stretch border-b border-border-subtle bg-gradient-to-b from-bg-subtle to-bg-panel'>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map((tab) => tab.id)} strategy={horizontalListSortingStrategy}>
          <div
            className='flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            role='tablist'
          >
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                active={tab.id === activeTabId}
                projects={projects}
                tab={tab}
                onCloseAllTabs={onCloseAllTabs}
                onCloseTab={onCloseTab}
                onCloseOtherTabs={onCloseOtherTabs}
                onCloseTabsToLeft={onCloseTabsToLeft}
                onCloseTabsToRight={onCloseTabsToRight}
                onSelectTab={onSelectTab}
                onSortByProject={onSortByProject}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableTabProps {
  readonly active: boolean;
  readonly projects: ReadonlyArray<ProjectSummary>;
  readonly tab: WorkspaceTabModel;
  readonly onCloseAllTabs: () => void;
  readonly onCloseTab: (id: string) => void;
  readonly onCloseTabsToLeft: (id: string) => void;
  readonly onCloseTabsToRight: (id: string) => void;
  readonly onCloseOtherTabs: (id: string) => void;
  readonly onSelectTab: (id: string) => void;
  readonly onSortByProject: () => void;
}

function SortableTab(
  {
    active,
    projects,
    tab,
    onCloseAllTabs,
    onCloseOtherTabs,
    onCloseTab,
    onCloseTabsToLeft,
    onCloseTabsToRight,
    onSelectTab,
    onSortByProject,
  }: SortableTabProps,
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });
  const project = projects.find((item) => item.id === tab.projectId);
  const style = { transform: CSS.Transform.toString(transform), transition };
  const icon = iconForTabKind(tab.kind);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          className={cn(
            'relative grid h-full min-w-[clamp(140px,18vw,172px)] max-w-[260px] grid-cols-[minmax(0,1fr)_22px] items-center gap-2 border-r border-border-subtle px-2 text-left text-sm text-text-secondary transition-colors hover:bg-action-ghost-hover',
            'cursor-grab active:cursor-grabbing',
            active
              && 'bg-bg-panel text-text-primary after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-action-primary',
            isDragging && 'z-10 border-l border-action-primary bg-bg-panel opacity-80 shadow-lg',
          )}
          role='tab'
          style={style}
          tabIndex={active ? 0 : -1}
          aria-selected={active}
          onClick={() => onSelectTab(tab.id)}
        >
          <span className='flex min-w-0 items-center gap-2'>
            <span className='grid size-4 shrink-0 place-items-center text-text-muted'>{icon}</span>
            <span className='min-w-0 truncate font-semibold'>{tab.title}</span>
            <span className='truncate text-xs text-text-muted'>
              {project?.name ?? 'No project'}
            </span>
          </span>
          <IconButton
            icon={<X size={13} aria-hidden='true' />}
            label={`Close ${tab.title}`}
            size='xs'
            variant='ghost'
            onClick={(event) => {
              event.stopPropagation();
              onCloseTab(tab.id);
            }}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onSelectTab(tab.id)}>Switch to tab</ContextMenuItem>
        <ContextMenuItem onSelect={() => onCloseTab(tab.id)}>Close tab</ContextMenuItem>
        <ContextMenuItem onSelect={() => onCloseOtherTabs(tab.id)}>
          <X size={13} aria-hidden='true' /> Close Others
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onCloseTabsToLeft(tab.id)}>
          <ArrowLeft size={13} aria-hidden='true' /> Close Tabs to Left
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onCloseTabsToRight(tab.id)}>
          <ArrowRight size={13} aria-hidden='true' /> Close Tabs to Right
        </ContextMenuItem>
        <ContextMenuItem onSelect={onSortByProject}>
          <Database size={13} aria-hidden='true' /> Sort by Account
        </ContextMenuItem>
        <ContextMenuItem onSelect={onCloseAllTabs}>
          <Trash2 size={13} aria-hidden='true' /> Close All
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function iconForTabKind(kind: WorkspaceTabKind): ReactNode {
  if (kind === 'firestore-query') return <Database size={14} aria-hidden='true' />;
  if (kind === 'auth-users') return <Users size={14} aria-hidden='true' />;
  if (kind === 'js-query') return <Code2 size={14} aria-hidden='true' />;
  return <Folder size={14} aria-hidden='true' />;
}

export type WorkspaceTabStripNode = ReactNode;
