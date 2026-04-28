import type { App } from 'firebase-admin/app';
import { cert, deleteApp, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import type {
  FirebaseConnectionConfig,
  FirebaseConnectionResolver,
} from './admin-firestore-provider.ts';

interface CachedAuth {
  readonly app: App;
  readonly auth: Auth;
  readonly cacheKey: string;
}

const noop = () => {};

export class AdminAuthProvider {
  private readonly cache = new Map<string, CachedAuth>();
  private envQueue: Promise<void> = Promise.resolve();
  private readonly resolver: FirebaseConnectionResolver;

  constructor(resolver: FirebaseConnectionResolver) {
    this.resolver = resolver;
  }

  async useAuth<T>(
    connectionId: string,
    operation: (auth: Auth) => Promise<T> | T,
  ): Promise<T> {
    const config = await this.resolver.resolveConnection(connectionId);
    return await this.withAuthEmulatorHost(config, async () => {
      const auth = await this.getCachedAuth(connectionId, config);
      return await operation(auth);
    });
  }

  async invalidateConnection(connectionId: string): Promise<void> {
    const cached = this.cache.get(connectionId);
    if (!cached) return;
    this.cache.delete(connectionId);
    await deleteApp(cached.app);
  }

  async clear(): Promise<void> {
    const cached = [...this.cache.values()];
    this.cache.clear();
    await Promise.all(cached.map((entry) => deleteApp(entry.app)));
  }

  private async getCachedAuth(
    connectionId: string,
    config: FirebaseConnectionConfig,
  ): Promise<Auth> {
    const cacheKey = cacheKeyFor(config);
    const cached = this.cache.get(connectionId);
    if (cached?.cacheKey === cacheKey) return cached.auth;
    if (cached) await deleteApp(cached.app);

    const app = initializeApp(appOptionsFor(config), appNameFor(connectionId, cacheKey));
    const auth = getAuth(app);
    this.cache.set(connectionId, { app, auth, cacheKey });
    return auth;
  }

  private async withAuthEmulatorHost<T>(
    config: FirebaseConnectionConfig,
    operation: () => Promise<T>,
  ): Promise<T> {
    const nextHost = authEmulatorHostFor(config);
    let release = noop;
    const previous = this.envQueue.catch(() => undefined);
    this.envQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    const previousHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
    if (nextHost) {
      process.env['FIREBASE_AUTH_EMULATOR_HOST'] = nextHost;
    } else {
      delete process.env['FIREBASE_AUTH_EMULATOR_HOST'];
    }

    try {
      return await operation();
    } finally {
      if (previousHost === undefined) delete process.env['FIREBASE_AUTH_EMULATOR_HOST'];
      else process.env['FIREBASE_AUTH_EMULATOR_HOST'] = previousHost;
      release();
    }
  }
}

function authEmulatorHostFor(config: FirebaseConnectionConfig): string | null {
  if (config.project.target !== 'emulator') return null;
  const authHost = config.project.emulator?.authHost;
  if (!authHost) throw new Error(`Auth emulator host is required for ${config.project.name}.`);
  return authHost;
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
    emulatorHost: project.emulator?.authHost ?? null,
    projectId: project.projectId,
    target: project.target,
  });
}

function appNameFor(connectionId: string, cacheKey: string): string {
  const suffix = Math.abs(hash(cacheKey)).toString(36);
  return `firebase-desk-auth-${safeName(connectionId)}-${suffix}`;
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
