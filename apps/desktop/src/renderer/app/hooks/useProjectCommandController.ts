import type {
  ActivityLogAppendInput,
  ProjectAddInput,
  ProjectSummary,
  ProjectUpdatePatch,
} from '@firebase-desk/repo-contracts';
import type { QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  addProjectCommand,
  removeProjectCommand,
  updateProjectCommand,
} from '../../app-core/workspace/projectCommands.ts';
import type { RepositorySet } from '../RepositoryProvider.tsx';

interface UseProjectCommandControllerInput {
  readonly projects: RepositorySet['projects'];
  readonly queryClient: QueryClient;
  readonly recordActivity: (input: ActivityLogAppendInput) => Promise<void> | void;
  readonly setLastAction: (action: string) => void;
}

export function useProjectCommandController(
  {
    projects,
    queryClient,
    recordActivity,
    setLastAction,
  }: UseProjectCommandControllerInput,
) {
  const env = useMemo(() => ({
    invalidateProjects: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    now: Date.now,
    projects,
    recordActivity,
  }), [queryClient, recordActivity, projects]);

  return {
    addProject: async (input: ProjectAddInput): Promise<ProjectSummary> => {
      const result = await addProjectCommand(env, input);
      setLastAction(result.lastAction);
      return result.result;
    },
    removeProject: async (
      connectionId: string,
      project: ProjectSummary | null,
    ): Promise<void> => {
      const result = await removeProjectCommand(env, { connectionId, project });
      setLastAction(result.lastAction);
      return result.result;
    },
    updateProject: async (
      id: string,
      patch: ProjectUpdatePatch,
    ): Promise<ProjectSummary> => {
      const result = await updateProjectCommand(env, { id, patch });
      setLastAction(result.lastAction);
      return result.result;
    },
  };
}
