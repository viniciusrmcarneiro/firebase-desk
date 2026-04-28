import type {
  ProjectSummary,
  ScriptRunRequest,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScriptRunnerConnection } from './types.ts';
import { runScriptInWorker } from './worker-runtime.ts';

const firebaseMocks = vi.hoisted(() => {
  const db = { terminate: vi.fn(async () => {}) };
  const app = { name: 'app' };
  return {
    app,
    cert: vi.fn(),
    db,
    deleteApp: vi.fn(async () => {}),
    getAuth: vi.fn(() => ({ kind: 'auth' })),
    initializeApp: vi.fn(() => app),
    initializeFirestore: vi.fn(() => db),
    runUserScript: vi.fn(async (): Promise<ScriptRunResult> => ({
      returnValue: null,
      stream: [],
      logs: [],
      errors: [],
      durationMs: 0,
    })),
  };
});

vi.mock('firebase-admin/app', () => ({
  cert: firebaseMocks.cert,
  deleteApp: firebaseMocks.deleteApp,
  initializeApp: firebaseMocks.initializeApp,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: firebaseMocks.getAuth,
}));

vi.mock('firebase-admin/firestore', () => ({
  initializeFirestore: firebaseMocks.initializeFirestore,
}));

vi.mock('./runner.ts', () => ({
  runUserScript: firebaseMocks.runUserScript,
}));

const originalFirestoreHost = process.env['FIRESTORE_EMULATOR_HOST'];
const originalAuthHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];

afterEach(() => {
  vi.clearAllMocks();
  restoreEnv('FIRESTORE_EMULATOR_HOST', originalFirestoreHost);
  restoreEnv('FIREBASE_AUTH_EMULATOR_HOST', originalAuthHost);
});

describe('runScriptInWorker', () => {
  it('requires auth emulator host without throwing a TypeError first', async () => {
    await expect(runScriptInWorker(
      request(),
      connection({
        emulator: { firestoreHost: '127.0.0.1:8080' } as ProjectSummary['emulator'],
      }),
    )).rejects.toThrow('Auth emulator host is required for Local Emulator.');

    expect(firebaseMocks.initializeApp).not.toHaveBeenCalled();
  });

  it('sets and restores emulator environment while running scripts', async () => {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'previous-firestore';
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'previous-auth';
    firebaseMocks.runUserScript.mockImplementationOnce(async () =>
      ({
        returnValue: {
          firestoreHost: process.env['FIRESTORE_EMULATOR_HOST'],
          authHost: process.env['FIREBASE_AUTH_EMULATOR_HOST'],
        },
        stream: [],
        logs: [],
        errors: [],
        durationMs: 0,
      }) satisfies ScriptRunResult
    );

    await expect(runScriptInWorker(request(), connection())).resolves.toMatchObject({
      returnValue: {
        firestoreHost: '127.0.0.1:8080',
        authHost: '127.0.0.1:9099',
      },
    });

    expect(process.env['FIRESTORE_EMULATOR_HOST']).toBe('previous-firestore');
    expect(process.env['FIREBASE_AUTH_EMULATOR_HOST']).toBe('previous-auth');
  });
});

function request(): ScriptRunRequest {
  return { connectionId: 'emu', runId: 'run-1', source: 'return 1;' };
}

function connection(projectPatch: Partial<ProjectSummary> = {}): ScriptRunnerConnection {
  return {
    credentialJson: null,
    project: {
      id: 'emu',
      name: 'Local Emulator',
      projectId: 'demo-local',
      target: 'emulator',
      emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
      hasCredential: false,
      credentialEncrypted: null,
      createdAt: '2026-04-28T00:00:00.000Z',
      ...projectPatch,
    } as ProjectSummary,
  };
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
