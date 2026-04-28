import type {
  AuthRepository,
  DataMode,
  FirestoreRepository,
  HotkeyOverrides,
  ProjectsRepository,
  ScriptRunnerRepository,
  SettingsPatch,
  SettingsRepository,
  SettingsSnapshot,
} from '@firebase-desk/repo-contracts';
import {
  MockAuthRepository,
  MockFirestoreRepository,
  MockProjectsRepository,
  MockScriptRunnerRepository,
  MockSettingsRepository,
} from '@firebase-desk/repo-mocks';
import { createContext, type ReactNode, useContext } from 'react';
import { IpcAuthRepository } from './repositories/ipc-auth-repository.ts';
import { IpcFirestoreRepository } from './repositories/ipc-firestore-repository.ts';
import { IpcProjectsRepository } from './repositories/ipc-projects-repository.ts';
import { IpcScriptRunnerRepository } from './repositories/ipc-script-runner-repository.ts';
import { IpcSettingsRepository } from './repositories/ipc-settings-repository.ts';

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

export interface CreateRepositoriesOptions {
  readonly dataMode: DataMode;
  readonly onDataModeChange?: (dataMode: DataMode) => void;
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

export function createRepositories(
  { dataMode, onDataModeChange }: CreateRepositoriesOptions,
): RepositorySet {
  const desktopApiAvailable = hasDesktopApi();
  const settings = desktopApiAvailable ? new IpcSettingsRepository() : new MockSettingsRepository();
  const repositories: RepositorySet = dataMode === 'live'
    ? {
      auth: new IpcAuthRepository(),
      firestore: new IpcFirestoreRepository(),
      projects: new IpcProjectsRepository(),
      scriptRunner: new IpcScriptRunnerRepository(),
      settings,
    }
    : { ...createMockRepositories(), settings };

  return {
    ...repositories,
    settings: onDataModeChange
      ? new DataModeNotifyingSettingsRepository(repositories.settings, onDataModeChange)
      : repositories.settings,
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

class DataModeNotifyingSettingsRepository implements SettingsRepository {
  constructor(
    private readonly delegate: SettingsRepository,
    private readonly onDataModeChange: (dataMode: DataMode) => void,
  ) {}

  async load(): Promise<SettingsSnapshot> {
    return await this.delegate.load();
  }

  async save(patch: SettingsPatch): Promise<SettingsSnapshot> {
    const snapshot = await this.delegate.save(patch);
    if (patch.dataMode && patch.dataMode !== snapshot.dataMode) {
      this.onDataModeChange(snapshot.dataMode);
    } else if (patch.dataMode) {
      this.onDataModeChange(patch.dataMode);
    }
    return snapshot;
  }

  async getHotkeyOverrides(): Promise<HotkeyOverrides> {
    return await this.delegate.getHotkeyOverrides();
  }

  async setHotkeyOverrides(overrides: HotkeyOverrides): Promise<void> {
    await this.delegate.setHotkeyOverrides(overrides);
  }
}

function hasDesktopApi(): boolean {
  return typeof window !== 'undefined' && Boolean(window.firebaseDesk?.projects?.list);
}
