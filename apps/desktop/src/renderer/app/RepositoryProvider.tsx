import type {
  AuthRepository,
  FirestoreRepository,
  ProjectsRepository,
  ScriptRunnerRepository,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import {
  MockAuthRepository,
  MockFirestoreRepository,
  MockProjectsRepository,
  MockScriptRunnerRepository,
  MockSettingsRepository,
} from '@firebase-desk/repo-mocks';
import { createContext, type ReactNode, useContext } from 'react';

export interface RepositorySet {
  readonly auth: AuthRepository;
  readonly firestore: FirestoreRepository;
  readonly projects: ProjectsRepository;
  readonly scriptRunner: ScriptRunnerRepository;
  readonly settings: SettingsRepository;
}

const RepositoryContext = createContext<RepositorySet | null>(null);

export interface RepositoryProviderProps {
  readonly children: ReactNode;
  readonly repositories: RepositorySet;
}

export function createMockRepositories(): RepositorySet {
  return {
    auth: new MockAuthRepository(),
    firestore: new MockFirestoreRepository(),
    projects: new MockProjectsRepository(),
    scriptRunner: new MockScriptRunnerRepository(),
    settings: new MockSettingsRepository(),
  };
}

export function RepositoryProvider({ children, repositories }: RepositoryProviderProps) {
  return <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>;
}

export function useRepositories(): RepositorySet {
  const value = useContext(RepositoryContext);
  if (!value) throw new Error('useRepositories must be used within RepositoryProvider');
  return value;
}
