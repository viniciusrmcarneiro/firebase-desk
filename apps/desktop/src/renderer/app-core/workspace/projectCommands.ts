import type {
  ActivityLogAppendInput,
  ProjectAddInput,
  ProjectsRepository,
  ProjectSummary,
  ProjectUpdatePatch,
} from '@firebase-desk/repo-contracts';

export interface ProjectCommandEnvironment {
  readonly invalidateProjects: () => Promise<void>;
  readonly now: () => number;
  readonly projects: Pick<ProjectsRepository, 'add' | 'remove' | 'update'>;
  readonly recordActivity: (input: ActivityLogAppendInput) => Promise<void> | void;
}

export interface ProjectCommandResult<T> {
  readonly lastAction: string;
  readonly result: T;
}

export async function addProjectCommand(
  env: ProjectCommandEnvironment,
  input: ProjectAddInput,
): Promise<ProjectCommandResult<ProjectSummary>> {
  const startedAt = env.now();
  try {
    const project = await env.projects.add(input);
    await env.invalidateProjects();
    void env.recordActivity({
      action: 'Add account',
      area: 'projects',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        name: project.name,
        projectId: project.projectId,
        target: project.target,
      },
      status: 'success',
      summary: `Added ${project.name}`,
      target: projectTarget(project),
    });
    return { lastAction: `Added ${project.name}`, result: project };
  } catch (error) {
    const message = messageFromError(error, 'Could not add project.');
    void env.recordActivity({
      action: 'Add account',
      area: 'projects',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        hasCredential: Boolean(input.credentialJson),
        name: input.name,
        projectId: input.projectId,
        target: input.target,
      },
      status: 'failure',
      summary: message,
    });
    throw toError(error, message);
  }
}

export async function updateProjectCommand(
  env: ProjectCommandEnvironment,
  input: {
    readonly id: string;
    readonly patch: ProjectUpdatePatch;
  },
): Promise<ProjectCommandResult<ProjectSummary>> {
  const startedAt = env.now();
  try {
    const project = await env.projects.update(input.id, input.patch);
    await env.invalidateProjects();
    void env.recordActivity({
      action: 'Update account',
      area: 'projects',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        changedKeys: changedProjectKeys(input.patch),
        projectId: project.projectId,
        target: project.target,
      },
      status: 'success',
      summary: `Updated ${project.name}`,
      target: projectTarget(project),
    });
    return { lastAction: `Updated ${project.name}`, result: project };
  } catch (error) {
    const message = messageFromError(error, 'Could not update project.');
    void env.recordActivity({
      action: 'Update account',
      area: 'projects',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        changedKeys: changedProjectKeys(input.patch),
        projectId: input.id,
      },
      status: 'failure',
      summary: message,
    });
    throw toError(error, message);
  }
}

export async function removeProjectCommand(
  env: ProjectCommandEnvironment,
  input: {
    readonly connectionId: string;
    readonly project: ProjectSummary | null;
  },
): Promise<ProjectCommandResult<void>> {
  const startedAt = env.now();
  try {
    await env.projects.remove(input.connectionId);
    await env.invalidateProjects();
    void env.recordActivity({
      action: 'Remove account',
      area: 'projects',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        connectionId: input.connectionId,
        projectId: input.project?.projectId ?? null,
      },
      status: 'success',
      summary: `Removed ${input.project?.name ?? 'project'}`,
      target: projectTarget(input.project),
    });
    return { lastAction: `Removed ${input.project?.name ?? 'project'}`, result: undefined };
  } catch (error) {
    const message = messageFromError(error, 'Could not remove project.');
    void env.recordActivity({
      action: 'Remove account',
      area: 'projects',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        connectionId: input.connectionId,
        projectId: input.project?.projectId ?? null,
      },
      status: 'failure',
      summary: message,
      target: projectTarget(input.project),
    });
    throw toError(error, message);
  }
}

export function projectTarget(project: ProjectSummary | null): ActivityLogAppendInput['target'] {
  if (!project) return undefined;
  return {
    connectionId: project.id,
    label: project.name,
    projectId: project.projectId,
    type: 'project',
  };
}

function changedProjectKeys(patch: ProjectUpdatePatch): string[] {
  return Object.keys(patch).filter((key) => key !== 'credentialJson');
}

function elapsedMs(startedAt: number, endedAt: number): number {
  return Math.max(0, endedAt - startedAt);
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function toError(error: unknown, message: string): Error {
  return error instanceof Error ? error : new Error(message);
}
