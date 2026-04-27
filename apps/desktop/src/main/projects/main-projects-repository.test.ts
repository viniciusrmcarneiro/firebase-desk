import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type CredentialEncryptionAdapter,
  CredentialsStore,
} from '../storage/credentials-store.ts';
import { ProjectsStore } from '../storage/projects-store.ts';
import { MainProjectsRepository } from './main-projects-repository.ts';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString('utf8'),
  },
}));

const tempDirs: string[] = [];

const plainTextEncryption: CredentialEncryptionAdapter = {
  isEncryptionAvailable: () => false,
  encryptString: (value) => Buffer.from(value),
  decryptString: (value) => value.toString('utf8'),
};

const encryptedStorage: CredentialEncryptionAdapter = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(`encrypted:${value}`),
  decryptString: (value) => value.toString('utf8').replace(/^encrypted:/, ''),
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe('MainProjectsRepository', () => {
  it('stores service-account credentials with plain-text fallback when encryption is unavailable', async () => {
    const userDataPath = await makeTempDir();
    const repo = createRepo(userDataPath, plainTextEncryption);
    const credentialJson = serviceAccountJson('demo-prod');

    const project = await repo.add({
      name: 'Demo Prod',
      projectId: 'demo-prod',
      target: 'production',
      credentialJson,
    });

    expect(project).toMatchObject({
      name: 'Demo Prod',
      projectId: 'demo-prod',
      target: 'production',
      hasCredential: true,
      credentialEncrypted: false,
    });
    expect(await repo.get(project.id)).toMatchObject({ id: project.id });

    const credentialFiles = await readdir(join(userDataPath, 'credentials'));
    expect(credentialFiles).toEqual([`${project.id}.plain.json`]);
    await expect(readFile(join(userDataPath, 'credentials', credentialFiles[0]!), 'utf8')).resolves
      .toBe(credentialJson);

    await repo.remove(project.id);
    expect(await repo.get(project.id)).toBeNull();
    await expect(readdir(join(userDataPath, 'credentials'))).resolves.toEqual([]);
  });

  it('stores encrypted service-account credentials when encryption is available', async () => {
    const userDataPath = await makeTempDir();
    const repo = createRepo(userDataPath, encryptedStorage);

    const project = await repo.add({
      name: 'Demo Prod',
      projectId: 'demo-prod',
      target: 'production',
      credentialJson: serviceAccountJson('demo-prod'),
    });

    expect(project.credentialEncrypted).toBe(true);
    await expect(readdir(join(userDataPath, 'credentials'))).resolves.toEqual([
      `${project.id}.bin`,
    ]);
  });

  it('updates project names and emulator hosts', async () => {
    const repo = createRepo(await makeTempDir(), plainTextEncryption);
    const project = await repo.add({
      name: 'Local',
      projectId: 'demo-local',
      target: 'emulator',
      emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
    });

    const updated = await repo.update(project.id, {
      name: 'Local Renamed',
      emulator: { firestoreHost: 'localhost:8081', authHost: 'localhost:9098' },
    });

    expect(updated).toMatchObject({
      name: 'Local Renamed',
      emulator: { firestoreHost: 'localhost:8081', authHost: 'localhost:9098' },
    });
  });

  it('rejects empty project names on update', async () => {
    const repo = createRepo(await makeTempDir(), plainTextEncryption);
    const project = await repo.add({
      name: 'Local',
      projectId: 'demo-local',
      target: 'emulator',
      emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
    });

    await expect(repo.update(project.id, { name: ' ' })).rejects.toThrow(
      'Project display name is required.',
    );
  });

  it('rejects invalid emulator host formats', async () => {
    const repo = createRepo(await makeTempDir(), plainTextEncryption);

    await expect(repo.add({
      name: 'Local',
      projectId: 'demo-local',
      target: 'emulator',
      emulator: { firestoreHost: 'localhost', authHost: 'localhost:9099' },
    })).rejects.toThrow('Firestore emulator host must use host:port format.');
  });
});

function createRepo(userDataPath: string, encryption: CredentialEncryptionAdapter) {
  return new MainProjectsRepository(
    new ProjectsStore(userDataPath),
    new CredentialsStore(userDataPath, encryption),
  );
}

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'firebase-desk-projects-'));
  tempDirs.push(dir);
  return dir;
}

function serviceAccountJson(projectId: string): string {
  return JSON.stringify({
    type: 'service_account',
    project_id: projectId,
    client_email: `admin@${projectId}.iam.gserviceaccount.com`,
    private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    private_key_id: 'key-id',
  });
}
