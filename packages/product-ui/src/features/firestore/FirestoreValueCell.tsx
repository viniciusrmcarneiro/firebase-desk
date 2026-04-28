import {
  FirestoreBytes,
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
} from '@firebase-desk/data-format';
import { type ReactNode } from 'react';

interface TypedValueSummary {
  readonly label: string;
  readonly title?: string;
  readonly value: string;
}

export function FirestoreValueCell({ value }: { readonly value: unknown; }): ReactNode {
  const typed = typedValueSummary(value);
  if (!typed) return formatFirestoreValue(value);
  return (
    <span
      className='inline-flex max-w-full items-center gap-1.5 overflow-hidden align-middle'
      title={typed.title ?? typed.value}
    >
      <span className='shrink-0 rounded border border-border-subtle bg-bg-subtle px-1 py-0.5 font-mono text-[10px] leading-none text-text-muted'>
        {typed.label}
      </span>
      <span className='min-w-0 truncate font-mono text-xs text-text-primary'>{typed.value}</span>
    </span>
  );
}

export function formatFirestoreValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  const typed = typedValueSummary(value);
  if (typed) return typed.value;
  if (typeof value === 'object') return 'Object';
  return String(value);
}

export function firestoreValueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const nativeType = nativeValueType(value);
  if (nativeType) return nativeType;
  if (isPlainObject(value) && typeof value['__type__'] === 'string') return value['__type__'];
  return typeof value;
}

export function isFirestoreTypedValue(value: unknown): boolean {
  return typedValueSummary(value) !== null;
}

function typedValueSummary(value: unknown): TypedValueSummary | null {
  if (value instanceof FirestoreTimestamp) {
    return timestampSummary({ value: value.isoString });
  }
  if (value instanceof FirestoreGeoPoint) {
    return geoPointSummary({ latitude: value.latitude, longitude: value.longitude });
  }
  if (value instanceof FirestoreReference) {
    return referenceSummary({ path: value.path });
  }
  if (value instanceof FirestoreBytes) {
    return bytesSummary({ base64: value.base64 });
  }
  if (!isPlainObject(value)) return null;
  const type = value['__type__'];
  if (typeof type !== 'string') return null;
  switch (type) {
    case 'timestamp':
      return timestampSummary(value);
    case 'geoPoint':
      return geoPointSummary(value);
    case 'reference':
      return referenceSummary(value);
    case 'bytes':
      return bytesSummary(value);
    case 'array':
      return encodedArraySummary(value);
    case 'map':
      return encodedMapSummary(value);
    default: {
      const title = safeJson(value);
      return {
        label: shortLabel(type),
        ...(title ? { title } : {}),
        value: `Object(${Math.max(Object.keys(value).length - 1, 0)})`,
      };
    }
  }
}

function nativeValueType(value: unknown): string | null {
  if (value instanceof FirestoreTimestamp) return 'timestamp';
  if (value instanceof FirestoreGeoPoint) return 'geoPoint';
  if (value instanceof FirestoreReference) return 'reference';
  if (value instanceof FirestoreBytes) return 'bytes';
  return null;
}

function timestampSummary(value: Record<string, unknown>): TypedValueSummary {
  const raw = typeof value['value'] === 'string' ? value['value'] : '';
  return {
    label: 'time',
    ...(raw ? { title: raw } : {}),
    value: formatUserTimestamp(raw),
  };
}

function geoPointSummary(value: Record<string, unknown>): TypedValueSummary {
  const latitude = value['latitude'];
  const longitude = value['longitude'];
  return {
    label: 'geo',
    value: typeof latitude === 'number' && typeof longitude === 'number'
      ? `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`
      : 'Invalid location',
  };
}

function referenceSummary(value: Record<string, unknown>): TypedValueSummary {
  const path = typeof value['path'] === 'string' ? value['path'] : '';
  return {
    label: 'ref',
    ...(path ? { title: path } : {}),
    value: path || 'Invalid reference',
  };
}

function bytesSummary(value: Record<string, unknown>): TypedValueSummary {
  const base64 = typeof value['base64'] === 'string' ? value['base64'] : '';
  return {
    label: 'bytes',
    ...(base64 ? { title: base64 } : {}),
    value: `${base64ByteCount(base64)} bytes`,
  };
}

function encodedArraySummary(value: Record<string, unknown>): TypedValueSummary {
  const entries = value['value'];
  return {
    label: 'array',
    value: Array.isArray(entries) ? `Array(${entries.length})` : 'Invalid array',
  };
}

function encodedMapSummary(value: Record<string, unknown>): TypedValueSummary {
  const entries = value['value'];
  return {
    label: 'map',
    value: isPlainObject(entries) ? `Map(${Object.keys(entries).length})` : 'Invalid map',
  };
}

function formatUserTimestamp(value: string): string {
  if (!value) return 'Invalid timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    + `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
    + formatTimezoneOffset(date);
}

function formatTimezoneOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  return `${sign}${pad2(Math.floor(absoluteMinutes / 60))}:${pad2(absoluteMinutes % 60)}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatCoordinate(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return String(Number(value.toFixed(6)));
}

function base64ByteCount(value: string): number {
  const normalized = value.replace(/\s/g, '');
  if (!normalized) return 0;
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(normalized.length * 3 / 4) - padding);
}

function shortLabel(value: string): string {
  return value.length > 8 ? `${value.slice(0, 8)}...` : value;
}

function safeJson(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
