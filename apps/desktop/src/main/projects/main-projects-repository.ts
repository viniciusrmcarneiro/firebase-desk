import type {
  EmulatorConnectionProfile,
  ProjectAddInput,
  ProjectsRepository,
  ProjectSummary,
  ProjectUpdatePatch,
  ServiceAccountValidationResult,
} from '@firebase-desk/repo-contracts';
import {
  parseServiceAccountJson,
  validateServiceAccountJson,
} from '../firebase/service-account.ts';
import { CredentialsStore } from '../storage/credentials-store.ts';
import { ProjectsStore } from '../storage/projects-store.ts';

const HOST_PORT_PATTERN = /^[^:\s]+:\d+$/;

export class MainProjectsRepository implements ProjectsRepository {
  constructor(
    private readonly projectsStore: ProjectsStore,
    private readonly credentialsStore: CredentialsStore,
  ) {}

  async list(): Promise<ReadonlyArray<ProjectSummary>> {
    return await this.projectsStore.list();
  }

  async get(id: string): Promise<ProjectSummary | null> {
    return (await this.list()).find((project) => project.id === id) ?? null;
  }

  async add(input: ProjectAddInput): Promise<ProjectSummary> {
    const projects = await this.projectsStore.list();
    const normalized = normalizeAddInput(input);
    const id = uniqueProjectId(normalized.name, projects);
    let credentialEncrypted: boolean | null = null;
    let hasCredential = false;

    if (normalized.credentialJson) {
      parseServiceAccountJson(normalized.credentialJson);
      const saved = await this.credentialsStore.save(id, normalized.credentialJson);
      credentialEncrypted = saved.encrypted;
      hasCredential = true;
    }

    const next: ProjectSummary = {
      id,
      name: normalized.name,
      projectId: normalized.projectId,
      target: normalized.target,
      ...(normalized.emulator ? { emulator: normalized.emulator } : {}),
      hasCredential,
      credentialEncrypted,
      createdAt: new Date().toISOString(),
    };

    await this.projectsStore.save([...projects, next]);
    return next;
  }

  async update(id: string, patch: ProjectUpdatePatch): Promise<ProjectSummary> {
    const projects = await this.projectsStore.list();
    const index = projects.findIndex((project) => project.id === id);
    if (index < 0) throw new Error(`Project not found: ${id}`);

    const current = projects[index]!;
    const next: ProjectSummary = {
      ...current,
      ...(patch.name ? { name: normalizeName(patch.name) } : {}),
      ...(patch.emulator ? { emulator: normalizeEmulator(patch.emulator) } : {}),
    };

    const updated = projects.map((project) => project.id === id ? next : project);
    await this.projectsStore.save(updated);
    return next;
  }

  async remove(id: string): Promise<void> {
    const projects = await this.projectsStore.list();
    const next = projects.filter((project) => project.id !== id);
    await this.projectsStore.save(next);
    await this.credentialsStore.remove(id);
  }

  async validateServiceAccount(json: string): Promise<ServiceAccountValidationResult> {
    return validateServiceAccountJson(json);
  }
}

function normalizeAddInput(input: ProjectAddInput): ProjectAddInput {
  const name = normalizeName(input.name);
  const projectId = input.projectId.trim();
  if (!projectId) throw new Error('Project ID is required.');

  if (input.target === 'production') {
    if (!input.credentialJson) throw new Error('Service account JSON is required.');
    const summary = parseServiceAccountJson(input.credentialJson);
    if (summary.projectId !== projectId) {
      throw new Error('Service account project_id does not match the selected project ID.');
    }
    return { name, projectId, target: 'production', credentialJson: input.credentialJson };
  }

  return {
    name,
    projectId,
    target: 'emulator',
    emulator: normalizeEmulator(input.emulator ?? defaultEmulator()),
  };
}

function normalizeName(name: string): string {
  const value = name.trim();
  if (!value) throw new Error('Project display name is required.');
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

function defaultEmulator(): EmulatorConnectionProfile {
  return { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' };
}

function uniqueProjectId(
  name: string,
  projects: ReadonlyArray<ProjectSummary>,
): string {
  const base = slugify(name) || 'project';
  const existing = new Set(projects.map((project) => project.id));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
