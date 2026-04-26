import { _electron as electron, type ElectronApplication } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = resolve(__dirname, '../../apps/desktop');
const MAIN_ENTRY = resolve(DESKTOP_DIR, 'out/main/index.js');

export async function launchDesktop(): Promise<ElectronApplication> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') env[k] = v;
  }
  env['FIRESTORE_EMULATOR_HOST'] = process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080';
  env['FIREBASE_AUTH_EMULATOR_HOST'] = process.env['FIREBASE_AUTH_EMULATOR_HOST']
    ?? '127.0.0.1:9099';
  env['GCLOUD_PROJECT'] = 'demo-local';
  return electron.launch({
    args: [MAIN_ENTRY],
    cwd: DESKTOP_DIR,
    env,
  });
}
