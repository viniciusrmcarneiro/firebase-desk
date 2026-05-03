import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@firebase-desk/ui';

interface ProjectSwitcherProps {
  readonly activeProject: ProjectSummary;
  readonly onConnectionChange: (connectionId: string) => void;
  readonly projects: ReadonlyArray<ProjectSummary>;
}

export function ProjectSwitcher(
  { activeProject, onConnectionChange, projects }: ProjectSwitcherProps,
) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label='Select connection'
          className='max-w-56 justify-start'
          variant='secondary'
        >
          <span className='text-text-muted'>Connection</span>
          <span className='truncate'>{activeProject.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onSelect={() => onConnectionChange(project.id)}
          >
            <span className='min-w-0 flex-1 truncate'>{project.name}</span>
            <Badge variant={project.target}>{project.target}</Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
