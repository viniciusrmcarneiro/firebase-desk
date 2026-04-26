import {
  FirestoreBytes,
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
  type NativeValue,
} from './native.ts';
import {
  ENCODED_TYPES,
  type EncodedTagged,
  type EncodedTypeName,
  type EncodedValue,
} from './types.ts';

export class DataFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataFormatError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEncodedTag(
  value: unknown,
): value is { __type__: EncodedTypeName; } & Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  const tag = value['__type__'];
  return typeof tag === 'string' && (ENCODED_TYPES as ReadonlyArray<string>).includes(tag);
}

export function encode(value: NativeValue): EncodedValue {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof FirestoreTimestamp) {
    return { __type__: 'timestamp', value: value.isoString };
  }
  if (value instanceof FirestoreGeoPoint) {
    return { __type__: 'geoPoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof FirestoreReference) {
    return { __type__: 'reference', path: value.path };
  }
  if (value instanceof FirestoreBytes) {
    return { __type__: 'bytes', base64: value.base64 };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => encode(entry as NativeValue));
  }
  if (isPlainObject(value)) {
    const out: Record<string, EncodedValue> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = encode(v as NativeValue);
    }
    return out;
  }
  throw new DataFormatError(`Unsupported native value: ${String(value)}`);
}

export function decode(value: EncodedValue): NativeValue {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => decode(entry));
  }
  if (isEncodedTag(value)) {
    return decodeTagged(value as EncodedTagged);
  }
  if (isPlainObject(value)) {
    if (typeof (value as Record<string, unknown>)['__type__'] === 'string') {
      throw new DataFormatError(
        `Unknown encoded __type__: ${String((value as Record<string, unknown>)['__type__'])}`,
      );
    }
    const out: Record<string, NativeValue> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = decode(v as EncodedValue);
    }
    return out;
  }
  throw new DataFormatError(`Unsupported encoded value: ${JSON.stringify(value)}`);
}

function decodeTagged(value: EncodedTagged): NativeValue {
  switch (value.__type__) {
    case 'timestamp':
      return new FirestoreTimestamp(value.value);
    case 'geoPoint':
      return new FirestoreGeoPoint(value.latitude, value.longitude);
    case 'reference':
      return new FirestoreReference(value.path);
    case 'bytes':
      return new FirestoreBytes(value.base64);
    case 'array':
      return value.value.map((entry) => decode(entry));
    case 'map': {
      const out: Record<string, NativeValue> = {};
      for (const [k, v] of Object.entries(value.value)) {
        out[k] = decode(v);
      }
      return out;
    }
  }
}
