import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import { type App, cert, deleteApp, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { type Firestore, initializeFirestore, type Settings } from 'firebase-admin/firestore';

export interface FirebaseConnectionConfig {
  readonly credentialJson?: string | null;
  readonly project: ProjectSummary;
}

export interface FirebaseConnectionResolver {
  resolveConnection(connectionId: string): Promise<FirebaseConnectionConfig>;
}

interface CachedFirestore {
  readonly app: App;
  readonly cacheKey: string;
  readonly db: Firestore;
}

export class AdminFirestoreProvider {
  private readonly cache = new Map<string, CachedFirestore>();
  private readonly resolver: FirebaseConnectionResolver;

  constructor(resolver: FirebaseConnectionResolver) {
    this.resolver = resolver;
  }

  async getFirestore(connectionId: string): Promise<Firestore> {
    const config = await this.resolver.resolveConnection(connectionId);
    const cacheKey = cacheKeyFor(config);
    const cached = this.cache.get(connectionId);
    if (cached?.cacheKey === cacheKey) return cached.db;
    if (cached) await this.deleteCached(cached);

    const app = initializeApp(appOptionsFor(config), appNameFor(connectionId, cacheKey));
    const db = withFirestoreEmulatorHost(
      config,
      () => initializeFirestore(app, firestoreSettingsFor(config)),
    );
    this.cache.set(connectionId, { app, cacheKey, db });
    return db;
  }

  async invalidateConnection(connectionId: string): Promise<void> {
    const cached = this.cache.get(connectionId);
    if (!cached) return;
    this.cache.delete(connectionId);
    await this.deleteCached(cached);
  }

  async clear(): Promise<void> {
    const cached = [...this.cache.values()];
    this.cache.clear();
    await Promise.all(cached.map((entry) => this.deleteCached(entry)));
  }

  private async deleteCached(cached: CachedFirestore): Promise<void> {
    try {
      await cached.db.terminate();
    } finally {
      await deleteApp(cached.app);
    }
  }
}

function appOptionsFor(config: FirebaseConnectionConfig) {
  if (config.project.target === 'emulator') return { projectId: config.project.projectId };
  if (!config.credentialJson) {
    throw new Error(`Service account JSON is required for ${config.project.name}.`);
  }
  return {
    credential: cert(serviceAccountFromJson(config.credentialJson)),
    projectId: config.project.projectId,
  };
}

function firestoreSettingsFor(config: FirebaseConnectionConfig): Settings {
  const base = { ignoreUndefinedProperties: true, projectId: config.project.projectId };
  if (config.project.target === 'emulator') {
    if (!config.project.emulator?.firestoreHost) {
      throw new Error(`Firestore emulator host is required for ${config.project.name}.`);
    }
    return base;
  }
  return { ...base, preferRest: true };
}

function withFirestoreEmulatorHost<T>(
  config: FirebaseConnectionConfig,
  createFirestore: () => T,
): T {
  const previousHost = process.env['FIRESTORE_EMULATOR_HOST'];
  if (config.project.target === 'emulator') {
    process.env['FIRESTORE_EMULATOR_HOST'] = config.project.emulator?.firestoreHost ?? '';
  } else {
    delete process.env['FIRESTORE_EMULATOR_HOST'];
  }

  try {
    return createFirestore();
  } finally {
    if (previousHost === undefined) delete process.env['FIRESTORE_EMULATOR_HOST'];
    else process.env['FIRESTORE_EMULATOR_HOST'] = previousHost;
  }
}

function serviceAccountFromJson(json: string): ServiceAccount {
  const value = JSON.parse(json) as Record<string, unknown>;
  return {
    clientEmail: stringField(value, 'client_email'),
    privateKey: stringField(value, 'private_key'),
    projectId: stringField(value, 'project_id'),
  };
}

function stringField(value: Record<string, unknown>, field: string): string {
  const result = value[field];
  if (typeof result !== 'string' || !result.trim()) {
    throw new Error(`Service account field ${field} is required.`);
  }
  return result;
}

function cacheKeyFor({ project, credentialJson }: FirebaseConnectionConfig): string {
  return JSON.stringify({
    credential: Boolean(credentialJson),
    emulatorHost: project.emulator?.firestoreHost ?? null,
    projectId: project.projectId,
    target: project.target,
  });
}

function appNameFor(connectionId: string, cacheKey: string): string {
  const suffix = Math.abs(hash(cacheKey)).toString(36);
  return `firebase-desk-${safeName(connectionId)}-${suffix}`;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'connection';
}

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (Math.imul(31, result) + value.charCodeAt(index)) | 0;
  }
  return result;
}
