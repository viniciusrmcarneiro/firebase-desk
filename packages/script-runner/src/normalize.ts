import {
  encode,
  FirestoreBytes,
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
  type NativeValue,
} from '@firebase-desk/data-format';
import type { ScriptStreamItem } from '@firebase-desk/repo-contracts';
import {
  type CollectionReference,
  type DocumentReference,
  type DocumentSnapshot,
  GeoPoint,
  type QuerySnapshot,
  Timestamp,
} from 'firebase-admin/firestore';

export interface NormalizedValue {
  readonly value: unknown;
  readonly badge: string;
  readonly view: ScriptStreamItem['view'];
}

export function normalizeScriptValue(value: unknown): NormalizedValue | null {
  if (value === undefined || value === null) return null;
  if (isQuerySnapshot(value)) return normalizeQuerySnapshot(value);
  if (isDocumentSnapshot(value)) return normalizeDocumentSnapshot(value);
  if (Array.isArray(value)) return normalizeArray(value);
  if (isCollectionReference(value)) return normalizeCollectionReference(value);
  return {
    value: encodeAdminValue(value),
    badge: valueSummary(value),
    view: 'json',
  };
}

export function normalizeReturnValue(value: unknown): unknown {
  return normalizeScriptValue(value)?.value ?? null;
}

export interface NormalizedReturn {
  readonly returnValue: unknown;
  readonly streamItem: ScriptStreamItem | null;
}

export function normalizeReturnResult(value: unknown): NormalizedReturn {
  const normalized = normalizeScriptValue(value);
  if (!normalized) {
    return {
      returnValue: null,
      streamItem: null,
    };
  }
  return {
    returnValue: normalized.value,
    streamItem: {
      id: 'return-value',
      label: 'return value',
      badge: normalized.badge,
      view: normalized.view,
      value: normalized.value,
    },
  };
}

export function normalizeReturnStreamItem(value: unknown): ScriptStreamItem | null {
  return normalizeReturnResult(value).streamItem;
}

export function normalizeStreamItem(
  value: unknown,
  index: number,
): ScriptStreamItem | null {
  const normalized = normalizeScriptValue(value);
  if (!normalized) return null;
  return {
    id: `yield-${index}`,
    label: streamItemLabel(value, index),
    badge: normalized.badge,
    view: normalized.view,
    value: normalized.value,
  };
}

function streamItemLabel(value: unknown, index: number): string {
  if (isDocumentSnapshot(value)) return 'yield DocumentSnapshot';
  if (isQuerySnapshot(value)) return 'yield QuerySnapshot';
  return `yield ${index}`;
}

function normalizeArray(value: ReadonlyArray<unknown>): NormalizedValue {
  if (value.length > 0 && value.every((item) => isDocumentSnapshot(item))) {
    const docs = value.map((item) => documentResult(item));
    return {
      value: docs,
      badge: `${docs.length} docs`,
      view: 'table',
    };
  }
  if (value.length > 0 && value.every((item) => isQuerySnapshot(item))) {
    const docs = value.flatMap((item) => item.docs.map(documentResult));
    return {
      value: docs,
      badge: `${docs.length} docs`,
      view: 'table',
    };
  }
  return {
    value: value.map((entry) => encodeAdminValue(entry)),
    badge: `${value.length} items`,
    view: 'json',
  };
}

function normalizeQuerySnapshot(snapshot: QuerySnapshot): NormalizedValue {
  const docs = snapshot.docs.map(documentResult);
  return {
    value: docs,
    badge: `${docs.length} docs`,
    view: 'table',
  };
}

function normalizeDocumentSnapshot(snapshot: DocumentSnapshot): NormalizedValue {
  const doc = documentResult(snapshot);
  return {
    value: [doc],
    badge: doc.path,
    view: 'table',
  };
}

function normalizeCollectionReference(collection: CollectionReference): NormalizedValue {
  return {
    value: {
      id: collection.id,
      path: collection.path,
      type: 'CollectionReference',
    },
    badge: collection.path,
    view: 'json',
  };
}

function documentResult(snapshot: DocumentSnapshot) {
  return {
    id: snapshot.id,
    path: snapshot.ref.path,
    data: encodeAdminValue(snapshot.data() ?? {}) as Record<string, unknown>,
    hasSubcollections: false,
  };
}

function encodeAdminValue(value: unknown): unknown {
  return encode(normalizeAdminValue(value) as NativeValue);
}

function normalizeAdminValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Timestamp) return new FirestoreTimestamp(value.toDate().toISOString());
  if (value instanceof Date) return new FirestoreTimestamp(value.toISOString());
  if (value instanceof GeoPoint) return new FirestoreGeoPoint(value.latitude, value.longitude);
  if (isDocumentReference(value)) return new FirestoreReference(value.path);
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return new FirestoreBytes(value.toString('base64'));
  }
  if (value instanceof Uint8Array) {
    return new FirestoreBytes(Buffer.from(value).toString('base64'));
  }
  if (Array.isArray(value)) return value.map(normalizeAdminValue);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = normalizeAdminValue(entry);
    }
    return out;
  }
  throw new Error(`Unsupported script result value: ${String(value)}`);
}

function valueSummary(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `${value.length} items`;
  if (value instanceof Timestamp || value instanceof Date) return 'timestamp';
  if (value instanceof GeoPoint) return 'geoPoint';
  if (isDocumentReference(value)) return value.path;
  if (isPlainObject(value)) return `Object(${Object.keys(value).length})`;
  return typeof value;
}

function isQuerySnapshot(value: unknown): value is QuerySnapshot {
  if (!isPlainObject(value)) return false;
  return Array.isArray(value['docs'])
    && typeof value['size'] === 'number'
    && typeof value['forEach'] === 'function';
}

function isDocumentSnapshot(value: unknown): value is DocumentSnapshot {
  if (!isPlainObject(value)) return false;
  const ref = value['ref'];
  return typeof value['id'] === 'string'
    && isPlainObject(ref)
    && typeof ref['path'] === 'string'
    && typeof value['data'] === 'function';
}

function isCollectionReference(value: unknown): value is CollectionReference {
  if (!isPlainObject(value)) return false;
  return typeof value['id'] === 'string'
    && typeof value['path'] === 'string'
    && typeof value['doc'] === 'function';
}

function isDocumentReference(value: unknown): value is DocumentReference {
  if (!isPlainObject(value)) return false;
  return typeof value['path'] === 'string'
    && typeof value['get'] === 'function'
    && typeof value['collection'] === 'function';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
