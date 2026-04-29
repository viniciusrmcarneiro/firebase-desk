import type {
  ActivityLogRepository,
  AuthRepository,
  FirestoreRepository,
  ProjectsRepository,
  ScriptRunnerRepository,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';

export interface AppCoreRepositories {
  readonly activity: ActivityLogRepository;
  readonly auth: AuthRepository;
  readonly firestore: FirestoreRepository;
  readonly projects: ProjectsRepository;
  readonly scriptRunner: ScriptRunnerRepository;
  readonly settings: SettingsRepository;
}

export interface AppCoreClock {
  now(): number;
}

export interface AppCoreIdGenerator {
  nextId(prefix?: string): string;
}

export interface AppCoreQueryClient {
  cancelQueries(input: { readonly queryKey: readonly unknown[]; }): Promise<void>;
  invalidateQueries(input: { readonly queryKey: readonly unknown[]; }): Promise<void>;
  isFetching(input: { readonly queryKey: readonly unknown[]; }): number;
}

export interface AppCoreCommandEnvironment {
  readonly clock: AppCoreClock;
  readonly ids: AppCoreIdGenerator;
  readonly queryClient?: AppCoreQueryClient | undefined;
  readonly repositories: AppCoreRepositories;
}

export interface CreateAppCoreCommandEnvironmentInput {
  readonly clock?: AppCoreClock | undefined;
  readonly ids?: AppCoreIdGenerator | undefined;
  readonly queryClient?: AppCoreQueryClient | undefined;
  readonly repositories: AppCoreRepositories;
}

export function createAppCoreCommandEnvironment(
  input: CreateAppCoreCommandEnvironmentInput,
): AppCoreCommandEnvironment {
  return {
    clock: input.clock ?? systemClock,
    ids: input.ids ?? createCounterIdGenerator(),
    queryClient: input.queryClient,
    repositories: input.repositories,
  };
}

export const systemClock: AppCoreClock = {
  now: () => Date.now(),
};

export function createCounterIdGenerator(): AppCoreIdGenerator {
  let counter = 1;
  return {
    nextId(prefix = 'id') {
      return `${prefix}-${counter++}`;
    },
  };
}
