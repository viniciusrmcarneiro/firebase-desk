export type ProjectTarget = 'production' | 'emulator';

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly projectId: string;
  readonly target: ProjectTarget;
}

export interface ProjectsRepository {
  list(): Promise<ReadonlyArray<ProjectSummary>>;
  get(id: string): Promise<ProjectSummary | null>;
  add(input: Omit<ProjectSummary, 'id'> & { credentialJson?: string; }): Promise<ProjectSummary>;
  remove(id: string): Promise<void>;
}
