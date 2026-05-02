import { StatusBar, TargetModeBadge } from '@firebase-desk/product-ui';
import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import { Badge, Button } from '@firebase-desk/ui';
import { ListChecks } from 'lucide-react';
import type { ComponentProps } from 'react';

interface AppStatusBarProps {
  readonly activeProject: ProjectSummary | null;
  readonly activeTabTitle: string;
  readonly activityBadge: {
    readonly label: string;
    readonly variant: ComponentProps<typeof Badge>['variant'];
  } | null;
  readonly activityButtonVariant: ComponentProps<typeof Button>['variant'];
  readonly activityOpen: boolean;
  readonly lastAction: string;
  readonly selectedTreeItemId: string | null;
  readonly onActivityToggle: () => void;
}

export function AppStatusBar(
  {
    activeProject,
    activeTabTitle,
    activityBadge,
    activityButtonVariant,
    activityOpen,
    lastAction,
    selectedTreeItemId,
    onActivityToggle,
  }: AppStatusBarProps,
) {
  return (
    <StatusBar
      left={
        <>
          {activeProject ? <TargetModeBadge mode={activeProject.target} /> : null}
          <span>{activeProject?.name ?? 'No project'}</span>
          <span>{activeProject?.projectId ?? 'No project id'}</span>
          <span>{activeTabTitle}</span>
          <span>{selectedTreeItemId ?? 'No tree selection'}</span>
        </>
      }
      right={
        <>
          <Button
            aria-pressed={activityOpen}
            size='xs'
            variant={activityButtonVariant}
            onClick={onActivityToggle}
          >
            <ListChecks size={13} aria-hidden='true' />
            Activity
            {activityBadge
              ? <Badge variant={activityBadge.variant}>{activityBadge.label}</Badge>
              : null}
          </Button>
          <span>{lastAction}</span>
        </>
      }
    />
  );
}
