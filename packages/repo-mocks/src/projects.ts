import type {
  EmulatorConnectionProfile,
  ProjectAddInput,
  ProjectsRepository,
  ProjectSummary,
  ProjectUpdatePatch,
  ServiceAccountValidationResult,
} from '@firebase-desk/repo-contracts';
import { PROJECTS } from './fixtures/index.ts';

const HOST_PORT_PATTERN = /^[^:\s]+:\d+$/;

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
      ...(input.emulator ? { emulator: input.emulator } : {}),
      hasCredential: Boolean(input.credentialJson),
      credentialEncrypted: input.credentialJson ? true : null,
      createdAt: new Date().toISOString(),
    };
    this.projects.push(next);
    return next;
  }

  async update(id: string, patch: ProjectUpdatePatch): Promise<ProjectSummary> {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error(`Project not found: ${id}`);
    const current = this.projects[idx]!;
    if (patch.projectId !== undefined && current.target !== 'emulator') {
      throw new Error('Production project ID comes from the service account JSON.');
    }
    const next: ProjectSummary = {
      ...current,
      ...(patch.name !== undefined ? { name: normalizeName(patch.name) } : {}),
      ...(patch.projectId !== undefined ? { projectId: normalizeProjectId(patch.projectId) } : {}),
      ...(patch.emulator !== undefined ? { emulator: normalizeEmulator(patch.emulator) } : {}),
    };
    this.projects.splice(idx, 1, next);
    return next;
  }

  async remove(id: string): Promise<void> {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx >= 0) this.projects.splice(idx, 1);
  }

  async validateServiceAccount(json: string): Promise<ServiceAccountValidationResult> {
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>;
      const projectId = typeof parsed['project_id'] === 'string' ? parsed['project_id'] : '';
      const clientEmail = typeof parsed['client_email'] === 'string' ? parsed['client_email'] : '';
      if (!projectId || !clientEmail) {
        return { ok: false, errors: ['Missing project_id or client_email'] };
      }
      return { ok: true, summary: { type: 'service_account', projectId, clientEmail } };
    } catch {
      return { ok: false, errors: ['Invalid JSON'] };
    }
  }

  async pickServiceAccountFile() {
    return { canceled: true };
  }
}

function normalizeName(name: string): string {
  const value = name.trim();
  if (!value) throw new Error('Project display name is required.');
  return value;
}

function normalizeProjectId(projectId: string): string {
  const value = projectId.trim();
  if (!value) throw new Error('Project ID is required.');
  return value;
}

function normalizeEmulator(profile: EmulatorConnectionProfile): EmulatorConnectionProfile {
  const firestoreHost = profile.firestoreHost.trim();
  const authHost = profile.authHost.trim();
  if (!HOST_PORT_PATTERN.test(firestoreHost)) {
    throw new Error('Firestore emulator host must use host:port format.');
  }
  if (!HOST_PORT_PATTERN.test(authHost)) {
    throw new Error('Auth emulator host must use host:port format.');
  }
  return { firestoreHost, authHost };
}
