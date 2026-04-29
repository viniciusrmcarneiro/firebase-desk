import { FIRESTORE_PROJECT_ID } from './live-app.ts';

export interface FirestoreRestDocument {
  readonly createTime?: string;
  readonly fields?: Record<string, unknown>;
  readonly name: string;
  readonly updateTime?: string;
}

interface FirestoreRestListResponse {
  readonly documents?: ReadonlyArray<FirestoreRestDocument>;
}

export async function setFirestoreEmulatorDocument(
  documentPath: string,
  data: Record<string, unknown>,
): Promise<FirestoreRestDocument> {
  const response = await fetch(firestoreRestUrl(documentPath), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!response.ok) {
    throw new Error(`Firestore emulator patch failed: ${response.status} ${await response.text()}`);
  }
  return await response.json() as FirestoreRestDocument;
}

export async function deleteFirestoreEmulatorDocument(documentPath: string): Promise<void> {
  const response = await fetch(firestoreRestUrl(documentPath), { method: 'DELETE' });
  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(
      `Firestore emulator delete failed: ${response.status} ${await response.text()}`,
    );
  }
}

export async function getFirestoreEmulatorDocument(
  documentPath: string,
): Promise<FirestoreRestDocument | null> {
  const response = await fetch(firestoreRestUrl(documentPath));
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firestore emulator get failed: ${response.status} ${await response.text()}`);
  }
  return await response.json() as FirestoreRestDocument;
}

export async function listFirestoreEmulatorCollection(
  collectionPath: string,
): Promise<ReadonlyArray<FirestoreRestDocument>> {
  const response = await fetch(firestoreRestUrl(collectionPath));
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Firestore emulator list failed: ${response.status} ${await response.text()}`);
  }
  const page = await response.json() as FirestoreRestListResponse;
  return page.documents ?? [];
}

export function firestoreDocumentName(path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/${encodedPath}`;
}

function firestoreRestUrl(path: string): string {
  return `${firestoreEmulatorOrigin()}/v1/${firestoreDocumentName(path)}`;
}

function firestoreEmulatorOrigin(): string {
  const host = process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080';
  return host.startsWith('http://') || host.startsWith('https://') ? host : `http://${host}`;
}

function toFirestoreFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) fields[key] = toFirestoreValue(value);
  return fields;
}

function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record['__type__'] === 'timestamp' && typeof record['value'] === 'string') {
      return { timestampValue: record['value'] };
    }
    if (record['__type__'] === 'reference' && typeof record['path'] === 'string') {
      return { referenceValue: firestoreDocumentName(record['path']) };
    }
    if (record['__type__'] === 'bytes' && typeof record['base64'] === 'string') {
      return { bytesValue: record['base64'] };
    }
    if (
      record['__type__'] === 'geoPoint'
      && typeof record['latitude'] === 'number'
      && typeof record['longitude'] === 'number'
    ) {
      return {
        geoPointValue: { latitude: record['latitude'], longitude: record['longitude'] },
      };
    }
    return { mapValue: { fields: toFirestoreFields(record) } };
  }
  throw new Error(`Unsupported Firestore REST value: ${String(value)}`);
}
