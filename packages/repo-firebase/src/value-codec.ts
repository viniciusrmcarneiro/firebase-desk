import {
  decode,
  encode,
  FirestoreBytes,
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
  type NativeValue,
} from '@firebase-desk/data-format';
import { DocumentReference, type Firestore, GeoPoint, Timestamp } from 'firebase-admin/firestore';

export function encodeAdminData(data: Record<string, unknown>): Record<string, unknown> {
  return encode(normalizeAdminValue(data) as NativeValue) as Record<string, unknown>;
}

export function decodeFilterValue(db: Firestore, value: unknown): unknown {
  const native = decode(value as never);
  return toAdminValue(db, native);
}

function normalizeAdminValue(value: unknown): NativeValue {
  if (
    value === null || typeof value === 'string' || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return value;
  }
  if (value instanceof Timestamp) return new FirestoreTimestamp(value.toDate().toISOString());
  if (value instanceof Date) return new FirestoreTimestamp(value.toISOString());
  if (value instanceof GeoPoint) return new FirestoreGeoPoint(value.latitude, value.longitude);
  if (value instanceof DocumentReference) return new FirestoreReference(value.path);
  if (Buffer.isBuffer(value)) return new FirestoreBytes(value.toString('base64'));
  if (value instanceof Uint8Array) return new FirestoreBytes(Buffer.from(value).toString('base64'));
  if (Array.isArray(value)) return value.map((item) => normalizeAdminValue(item));
  if (value && typeof value === 'object') {
    const out: Record<string, NativeValue> = {};
    for (const [key, entry] of Object.entries(value)) out[key] = normalizeAdminValue(entry);
    return out;
  }
  return String(value);
}

function toAdminValue(db: Firestore, value: NativeValue): unknown {
  if (value instanceof FirestoreTimestamp) return Timestamp.fromDate(new Date(value.isoString));
  if (value instanceof FirestoreGeoPoint) return new GeoPoint(value.latitude, value.longitude);
  if (value instanceof FirestoreReference) return db.doc(value.path);
  if (value instanceof FirestoreBytes) return Buffer.from(value.base64, 'base64');
  if (Array.isArray(value)) return value.map((item) => toAdminValue(db, item));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) out[key] = toAdminValue(db, entry);
    return out;
  }
  return value;
}
