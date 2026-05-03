import type { DensityName } from '@firebase-desk/design-tokens';
import { SettingsDialog } from '@firebase-desk/product-ui';
import type {
  ProjectAddInput,
  ProjectSummary,
  ProjectUpdatePatch,
} from '@firebase-desk/repo-contracts';
import type { ComponentProps } from 'react';
import { CredentialWarningToast } from './CredentialWarningToast.tsx';
import { DestructiveActionDialog } from './DestructiveActionDialog.tsx';
import { AddProjectDialog } from './dialogs/AddProjectDialog.tsx';
import { EditProjectDialog } from './dialogs/EditProjectDialog.tsx';
import type { DestructiveAction } from './hooks/useDestructiveActionController.ts';
import type { RepositorySet } from './RepositoryProvider.tsx';

interface AppDialogsProps {
  readonly addProjectOpen: boolean;
  readonly canOpenDataDirectory: boolean;
  readonly credentialWarning: string | null;
  readonly dataDirectoryPath: string | null | undefined;
  readonly density: DensityName;
  readonly destructiveAction: DestructiveAction | null;
  readonly editingProject: ProjectSummary | null;
  readonly projectsRepository: RepositorySet['projects'];
  readonly settingsOpen: boolean;
  readonly onAddProjectOpenChange: (open: boolean) => void;
  readonly onCredentialWarningDismiss: () => void;
  readonly onDensityChange: (density: DensityName) => void;
  readonly onDestructiveActionOpenChange: (open: boolean) => void;
  readonly onEditProjectOpenChange: (open: boolean) => void;
  readonly onOpenDataDirectory: () => Promise<void>;
  readonly onProjectAdded: (project: ProjectSummary) => void;
  readonly onProjectAddSubmit: (input: ProjectAddInput) => Promise<ProjectSummary>;
  readonly onProjectUpdateSubmit: (
    id: string,
    patch: ProjectUpdatePatch,
  ) => Promise<ProjectSummary>;
  readonly onSettingsOpenChange: (open: boolean) => void;
  readonly onSettingsSaved: NonNullable<ComponentProps<typeof SettingsDialog>['onSettingsSaved']>;
}

export function AppDialogs(
  {
    addProjectOpen,
    canOpenDataDirectory,
    credentialWarning,
    dataDirectoryPath,
    density,
    destructiveAction,
    editingProject,
    projectsRepository,
    settingsOpen,
    onAddProjectOpenChange,
    onCredentialWarningDismiss,
    onDensityChange,
    onDestructiveActionOpenChange,
    onEditProjectOpenChange,
    onOpenDataDirectory,
    onProjectAdded,
    onProjectAddSubmit,
    onProjectUpdateSubmit,
    onSettingsOpenChange,
    onSettingsSaved,
  }: AppDialogsProps,
) {
  return (
    <>
      <SettingsDialog
        {...(canOpenDataDirectory
          ? {
            dataDirectoryPath,
            onOpenDataDirectory,
          }
          : {})}
        density={density}
        open={settingsOpen}
        onDensityChange={onDensityChange}
        onOpenChange={onSettingsOpenChange}
        onSettingsSaved={onSettingsSaved}
      />
      <DestructiveActionDialog
        action={destructiveAction}
        onOpenChange={onDestructiveActionOpenChange}
      />
      <AddProjectDialog
        open={addProjectOpen}
        projects={projectsRepository}
        onOpenChange={onAddProjectOpenChange}
        onProjectAdded={onProjectAdded}
        onSubmit={onProjectAddSubmit}
      />
      <EditProjectDialog
        open={Boolean(editingProject)}
        project={editingProject}
        onOpenChange={onEditProjectOpenChange}
        onSubmit={onProjectUpdateSubmit}
      />
      <CredentialWarningToast
        message={credentialWarning}
        onDismiss={onCredentialWarningDismiss}
      />
    </>
  );
}
