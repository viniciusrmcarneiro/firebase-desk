import type {
  PickServiceAccountFileResult,
  ProjectsRepository,
} from '@firebase-desk/repo-contracts';
import type { IpcHandlerMap } from './handler-types.ts';

export interface ProjectsHandlerDeps {
  readonly authProvider: {
    readonly invalidateConnection: (connectionId: string) => Promise<void>;
  };
  readonly firestoreProvider: {
    readonly invalidateConnection: (connectionId: string) => Promise<void>;
  };
  readonly firestoreRepository: { readonly invalidateConnection: (connectionId: string) => void; };
  readonly pickServiceAccountFile: () => Promise<PickServiceAccountFileResult>;
  readonly projectsRepository: ProjectsRepository & {
    readonly validateServiceAccount: NonNullable<ProjectsRepository['validateServiceAccount']>;
  };
}

export function createProjectsHandlers(
  deps: ProjectsHandlerDeps,
): Pick<
  IpcHandlerMap,
  | 'projects.add'
  | 'projects.get'
  | 'projects.list'
  | 'projects.pickServiceAccountFile'
  | 'projects.remove'
  | 'projects.update'
  | 'projects.validateServiceAccount'
> {
  return {
    'projects.list': async () => [...await deps.projectsRepository.list()],
    'projects.get': ({ id }) => deps.projectsRepository.get(id),
    'projects.add': (request) => deps.projectsRepository.add(request),
    'projects.update': async ({ id, patch }) => {
      const project = await deps.projectsRepository.update(id, patch);
      deps.firestoreRepository.invalidateConnection(id);
      await deps.firestoreProvider.invalidateConnection(id);
      await deps.authProvider.invalidateConnection(id);
      return project;
    },
    'projects.remove': async ({ id }) => {
      await deps.projectsRepository.remove(id);
      deps.firestoreRepository.invalidateConnection(id);
      await deps.firestoreProvider.invalidateConnection(id);
      await deps.authProvider.invalidateConnection(id);
    },
    'projects.validateServiceAccount': ({ json }) =>
      deps.projectsRepository.validateServiceAccount(json),
    'projects.pickServiceAccountFile': deps.pickServiceAccountFile,
  };
}
