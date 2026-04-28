import type {
  ScriptRunEvent,
  ScriptRunRequest,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';
import { type App, cert, deleteApp, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { type Firestore, initializeFirestore, type Settings } from 'firebase-admin/firestore';
import { runUserScript } from './runner.ts';
import type { ScriptRunnerConnection } from './types.ts';

export async function runScriptInWorker(
  request: ScriptRunRequest,
  connection: ScriptRunnerConnection,
  onEvent?: (event: ScriptRunEvent) => void,
): Promise<ScriptRunResult> {
  let app: App | null = null;
  let db: Firestore | null = null;
  const previousFirestoreHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const previousAuthHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];

  try {
    applyEmulatorEnvironment(connection);
    app = initializeApp(appOptionsFor(connection), appNameFor(request.runId));
    db = initializeFirestore(app, firestoreSettingsFor(connection));
    const auth = getAuth(app);
    return await runUserScript(
      request.source,
      { auth, db, project: connection.project },
      onEvent ? { runId: request.runId, onEvent } : undefined,
    );
  } finally {
    restoreEnv('FIRESTORE_EMULATOR_HOST', previousFirestoreHost);
    restoreEnv('FIREBASE_AUTH_EMULATOR_HOST', previousAuthHost);
    if (db) await db.terminate();
    if (app) await deleteApp(app);
  }
}

function applyEmulatorEnvironment(connection: ScriptRunnerConnection): void {
  if (connection.project.target !== 'emulator') {
    delete process.env['FIRESTORE_EMULATOR_HOST'];
    delete process.env['FIREBASE_AUTH_EMULATOR_HOST'];
    return;
  }
  if (!connection.project.emulator?.firestoreHost) {
    throw new Error(`Firestore emulator host is required for ${connection.project.name}.`);
  }
  if (!connection.project.emulator?.authHost) {
    throw new Error(`Auth emulator host is required for ${connection.project.name}.`);
  }
  process.env['FIRESTORE_EMULATOR_HOST'] = connection.project.emulator.firestoreHost;
  process.env['FIREBASE_AUTH_EMULATOR_HOST'] = connection.project.emulator.authHost;
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function appOptionsFor(connection: ScriptRunnerConnection) {
  if (connection.project.target === 'emulator') return { projectId: connection.project.projectId };
  if (!connection.credentialJson) {
    throw new Error(`Service account JSON is required for ${connection.project.name}.`);
  }
  return {
    credential: cert(serviceAccountFromJson(connection.credentialJson)),
    projectId: connection.project.projectId,
  };
}

function firestoreSettingsFor(connection: ScriptRunnerConnection): Settings {
  const base = {
    ignoreUndefinedProperties: true,
    projectId: connection.project.projectId,
  };
  return connection.project.target === 'emulator' ? base : { ...base, preferRest: true };
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

function appNameFor(runId: string): string {
  return `firebase-desk-script-${runId.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}
