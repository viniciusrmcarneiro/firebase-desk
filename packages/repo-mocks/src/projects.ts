import type { ProjectsRepository, ProjectSummary } from '@firebase-desk/repo-contracts';
import { PROJECTS } from './fixtures/index.ts';

type ProjectAddInput = Parameters<ProjectsRepository['add']>[0];

export class MockProjectsRepository implements ProjectsRepository {
  private readonly projects: ProjectSummary[] = [...PROJECTS];

  async list(): Promise<ReadonlyArray<ProjectSummary>> {
    return [...this.projects];
  }

  async get(id: string): Promise<ProjectSummary | null> {
    return this.projects.find((p) => p.id === id) ?? null;
  }

  async add(input: ProjectAddInput): Promise<ProjectSummary> {
    const next: ProjectSummary = {
      id: `proj_${this.projects.length + 1}`,
      name: input.name,
      projectId: input.projectId,
      target: input.target,
    };
    this.projects.push(next);
    return next;
  }

  async remove(id: string): Promise<void> {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx >= 0) this.projects.splice(idx, 1);
  }
}
