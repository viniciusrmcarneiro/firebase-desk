import { Buffer } from 'node:buffer';
import { FIRESTORE_PROJECT_ID } from './live-app.ts';

export interface AuthRestUser {
  readonly customAttributes?: string | Record<string, unknown>;
  readonly disabled?: boolean;
  readonly displayName?: string;
  readonly email?: string;
  readonly localId?: string;
}

interface AuthRestUsersResponse {
  readonly users?: ReadonlyArray<AuthRestUser>;
}

interface AuthSignInResponse {
  readonly idToken?: string;
}

export async function getAuthEmulatorUser(uid: string): Promise<AuthRestUser | null> {
  const signIn = await fetch(
    `${authEmulatorOrigin()}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      body: JSON.stringify({ returnSecureToken: true, token: unsignedCustomToken(uid) }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
  );
  if (signIn.ok) {
    const signInBody = await signIn.json() as AuthSignInResponse;
    if (signInBody.idToken) {
      const lookup = await fetch(
        `${authEmulatorOrigin()}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=fake-api-key`,
        {
          body: JSON.stringify({ idToken: signInBody.idToken }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        },
      );
      if (lookup.ok) {
        const body = await lookup.json() as AuthRestUsersResponse;
        return body.users?.[0] ?? null;
      }
    }
  }

  const direct = await fetch(
    `${authEmulatorOrigin()}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=fake-api-key`,
    {
      body: JSON.stringify({ localId: [uid] }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
  );
  if (direct.ok) {
    const body = await direct.json() as AuthRestUsersResponse;
    return body.users?.[0] ?? null;
  }

  const emulatorRead = await fetch(
    `${authEmulatorOrigin()}/emulator/v1/projects/${
      encodeURIComponent(FIRESTORE_PROJECT_ID)
    }/accounts/${encodeURIComponent(uid)}`,
  );
  if (emulatorRead.status === 404) return null;
  if (emulatorRead.ok) return await emulatorRead.json() as AuthRestUser;

  throw new Error(`Auth emulator get failed: ${emulatorRead.status} ${await emulatorRead.text()}`);
}

export function authCustomClaims(user: AuthRestUser | null): Record<string, unknown> {
  const raw = user?.customAttributes;
  if (!raw) return {};
  if (typeof raw === 'string') return JSON.parse(raw) as Record<string, unknown>;
  return { ...raw };
}

function authEmulatorOrigin(): string {
  const host = process.env['FIREBASE_AUTH_EMULATOR_HOST'] ?? '127.0.0.1:9099';
  return host.startsWith('http://') || host.startsWith('https://') ? host : `http://${host}`;
}

function unsignedCustomToken(uid: string): string {
  const now = Math.floor(Date.now() / 1000);
  const serviceAccount = `firebase-adminsdk-e2e@${FIRESTORE_PROJECT_ID}.iam.gserviceaccount.com`;
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${
    base64Url({
      aud:
        'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      exp: now + 3600,
      iat: now,
      iss: serviceAccount,
      sub: serviceAccount,
      uid,
    })
  }.`;
}

function base64Url(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
