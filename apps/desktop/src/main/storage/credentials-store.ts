import { safeStorage } from 'electron';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { writeBufferAtomic, writeStringAtomic } from './atomic-write.ts';

export interface CredentialEncryptionAdapter {
  readonly isEncryptionAvailable: () => boolean;
  readonly encryptString: (value: string) => Buffer;
  readonly decryptString: (value: Buffer) => string;
}

export interface SavedCredentialInfo {
  readonly encrypted: boolean;
}

const DEFAULT_ENCRYPTION: CredentialEncryptionAdapter = {
  isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
  encryptString: (value) => safeStorage.encryptString(value),
  decryptString: (value) => safeStorage.decryptString(value),
};

export class CredentialsStore {
  private readonly dirPath: string;
  private readonly encryption: CredentialEncryptionAdapter;

  constructor(userDataPath: string, encryption: CredentialEncryptionAdapter = DEFAULT_ENCRYPTION) {
    this.dirPath = join(userDataPath, 'credentials');
    this.encryption = encryption;
  }

  async save(projectId: string, credentialJson: string): Promise<SavedCredentialInfo> {
    await mkdir(this.dirPath, { recursive: true });
    await this.remove(projectId);
    if (this.encryption.isEncryptionAvailable()) {
      const filePath = encryptedPath(this.dirPath, projectId);
      await writeBufferAtomic(filePath, this.encryption.encryptString(credentialJson));
      return { encrypted: true };
    }

    const filePath = plainPath(this.dirPath, projectId);
    await writeStringAtomic(filePath, credentialJson);
    return { encrypted: false };
  }

  async load(projectId: string): Promise<string | null> {
    try {
      const encrypted = await readFile(encryptedPath(this.dirPath, projectId));
      return this.encryption.decryptString(encrypted);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }

    try {
      return await readFile(plainPath(this.dirPath, projectId), 'utf8');
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async remove(projectId: string): Promise<void> {
    await Promise.all([
      rm(encryptedPath(this.dirPath, projectId), { force: true }),
      rm(plainPath(this.dirPath, projectId), { force: true }),
    ]);
  }
}

function encryptedPath(dirPath: string, projectId: string): string {
  return join(dirPath, `${safeFileName(projectId)}.bin`);
}

function plainPath(dirPath: string, projectId: string): string {
  return join(dirPath, `${safeFileName(projectId)}.plain.json`);
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'project';
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}
