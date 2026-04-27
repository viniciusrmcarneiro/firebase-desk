import type {
  PickServiceAccountFileResult,
  ProjectAddInput,
  ProjectsRepository,
  ProjectSummary,
  ProjectUpdatePatch,
  ServiceAccountValidationResult,
} from '@firebase-desk/repo-contracts';

export class IpcProjectsRepository implements ProjectsRepository {
  async list(): Promise<ReadonlyArray<ProjectSummary>> {
    return await window.firebaseDesk.projects.list();
  }

  async get(id: string): Promise<ProjectSummary | null> {
    return await window.firebaseDesk.projects.get({ id });
  }

  async add(input: ProjectAddInput): Promise<ProjectSummary> {
    return await window.firebaseDesk.projects.add(input);
  }

  async update(id: string, patch: ProjectUpdatePatch): Promise<ProjectSummary> {
    return await window.firebaseDesk.projects.update({ id, patch });
  }

  async remove(id: string): Promise<void> {
    await window.firebaseDesk.projects.remove({ id });
  }

  async validateServiceAccount(json: string): Promise<ServiceAccountValidationResult> {
    return await window.firebaseDesk.projects.validateServiceAccount({ json });
  }

  async pickServiceAccountFile(): Promise<PickServiceAccountFileResult> {
    return await window.firebaseDesk.projects.pickServiceAccountFile();
  }
}
