import type {
  EmulatorConnectionProfile,
  ProjectAddInput,
  ProjectsRepository,
  ProjectSummary,
  ProjectUpdatePatch,
  ServiceAccountSummary,
  ServiceAccountValidationResult,
} from '@firebase-desk/repo-contracts';
import { PROJECTS } from './fixtures/index.ts';

const HOST_PORT_PATTERN = /^[^:\s]+:\d+$/;
const REQUIRED_SERVICE_ACCOUNT_FIELDS = [
  'type',
  'project_id',
  'client_email',
  'private_key',
  'private_key_id',
] as const;

export class MockProjectsRepository implements ProjectsRepository {
  private readonly projects: ProjectSummary[] = [...PROJECTS];

  async list(): Promise<ReadonlyArray<ProjectSummary>> {
    return [...this.projects];
  }

  async get(id: string): Promise<ProjectSummary | null> {
    return this.projects.find((p) => p.id === id) ?? null;
  }

  async add(input: ProjectAddInput): Promise<ProjectSummary> {
    const normalized = normalizeAddInput(input);
    const next: ProjectSummary = {
      id: `proj_${this.projects.length + 1}`,
      name: normalized.name,
      projectId: normalized.projectId,
      target: normalized.target,
      ...(normalized.emulator ? { emulator: normalized.emulator } : {}),
      hasCredential: Boolean(normalized.credentialJson),
      credentialEncrypted: normalized.credentialJson ? true : null,
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
      return { ok: true, summary: parseServiceAccountJson(json) };
    } catch (error) {
      return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }

  async pickServiceAccountFile() {
    return { canceled: true };
  }
}

function normalizeAddInput(input: ProjectAddInput): ProjectAddInput {
  const name = normalizeName(input.name);
  const projectId = normalizeProjectId(input.projectId);

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

function defaultEmulator(): EmulatorConnectionProfile {
  return { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' };
}

function parseServiceAccountJson(json: string): ServiceAccountSummary {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('Service account file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Service account JSON must be an object.');
  }

  const errors: string[] = [];
  for (const field of REQUIRED_SERVICE_ACCOUNT_FIELDS) {
    if (typeof parsed[field] !== 'string' || !parsed[field].trim()) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  if (parsed['type'] !== 'service_account') errors.push('Field type must be service_account.');
  if (errors.length > 0) throw new Error(errors.join('\n'));

  return {
    type: 'service_account',
    projectId: String(parsed['project_id']),
    clientEmail: String(parsed['client_email']),
  };
}
