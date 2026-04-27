/**
 * Seed script that pushes repo-mocks fixtures into the running Firebase Emulator.
 * Defaults to the repo's local emulator ports. firebase emulators:exec also sets these values.
 */
import {
  FirestoreBytes,
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
} from '@firebase-desk/data-format';
import { AUTH_USERS, COLLECTIONS } from '@firebase-desk/repo-mocks/fixtures';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GeoPoint, getFirestore } from 'firebase-admin/firestore';

process.env['FIRESTORE_EMULATOR_HOST'] ??= '127.0.0.1:8080';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= '127.0.0.1:9099';

const projectId = seedProjectId();

const app = initializeApp({ projectId });
const db = getFirestore(app);
const auth = getAuth(app);

function toAdminValue(value: unknown): unknown {
  if (value instanceof FirestoreTimestamp) {
    return new Date(value.isoString);
  }
  if (value instanceof FirestoreGeoPoint) {
    return new GeoPoint(value.latitude, value.longitude);
  }
  if (value instanceof FirestoreReference) {
    return db.doc(value.path);
  }
  if (value instanceof FirestoreBytes) {
    return Buffer.from(value.base64, 'base64');
  }
  if (Array.isArray(value)) return value.map(toAdminValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toAdminValue(v);
    }
    return out;
  }
  return value;
}

async function seedFirestore(): Promise<void> {
  for (const collection of COLLECTIONS) {
    for (const doc of collection.docs) {
      await db
        .collection(collection.path)
        .doc(doc.id)
        .set(toAdminValue(doc.data) as Record<string, unknown>);
    }
  }
}

async function seedAuth(): Promise<void> {
  for (const user of AUTH_USERS) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email ?? undefined,
        displayName: user.displayName ?? undefined,
        disabled: user.disabled,
      });
    } catch (err) {
      if ((err as { code?: string; }).code !== 'auth/uid-already-exists') throw err;
    }
    if (Object.keys(user.customClaims).length > 0) {
      await auth.setCustomUserClaims(user.uid, user.customClaims);
    }
  }
}

async function main(): Promise<void> {
  console.log(`[seed] using project ${projectId}`);
  console.log('[seed] override with GCLOUD_PROJECT=<project-id> pnpm seed');
  await seedFirestore();
  try {
    await seedAuth();
  } catch (err) {
    if (!isConnectionRefused(err)) throw err;
    console.warn('[seed] auth emulator unavailable; skipped auth users');
  }
  console.log('[seed] done');
}

function seedProjectId(): string {
  return (
    process.env['GCLOUD_PROJECT']
      ?? process.env['FIREBASE_PROJECT_ID']
      ?? projectIdFromFirebaseConfig()
      ?? 'demo-local'
  );
}

function projectIdFromFirebaseConfig(): string | undefined {
  const raw = process.env['FIREBASE_CONFIG'];
  if (!raw?.trim() || raw.trim().startsWith('{') === false) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const projectId = parsed['projectId'] ?? parsed['project_id'];
    return typeof projectId === 'string' && projectId.trim() ? projectId.trim() : undefined;
  } catch {
    return undefined;
  }
}

function isConnectionRefused(err: unknown): boolean {
  const error = err as { readonly code?: string; readonly message?: string; } | null;
  return error?.code === 'app/network-error' && error.message?.includes('ECONNREFUSED') === true;
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
