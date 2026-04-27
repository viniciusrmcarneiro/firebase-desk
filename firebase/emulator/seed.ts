/**
 * Seed script that pushes repo-mocks fixtures into the running Firebase Emulator.
 * Expects FIRESTORE_EMULATOR_HOST + FIREBASE_AUTH_EMULATOR_HOST to be set
 * (firebase emulators:exec sets both automatically).
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

const projectId = process.env['GCLOUD_PROJECT'] ?? 'demo-local';

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
  await seedFirestore();
  await seedAuth();
  console.log('[seed] done');
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
