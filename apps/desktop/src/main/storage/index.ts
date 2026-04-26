import { safeStorage } from 'electron';

/**
 * Phase 2 placeholder for credential storage. Real persistence (project metadata
 * + service-account JSON encrypted with Electron `safeStorage`) lands in Phase 3.
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function encryptString(value: string): Buffer {
  return safeStorage.encryptString(value);
}

export function decryptString(value: Buffer): string {
  return safeStorage.decryptString(value);
}
