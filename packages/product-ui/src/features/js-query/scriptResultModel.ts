import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  ScriptLogEntry,
  ScriptRunResult,
  ScriptStreamItem,
} from '@firebase-desk/repo-contracts';
import { formatFirestoreValue } from '../firestore/FirestoreValueCell.tsx';

export function firestoreDocumentsFromValue(
  value: unknown,
): ReadonlyArray<FirestoreDocumentResult> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;
    const data = record.data;
    if (typeof record.id !== 'string' || !data || typeof data !== 'object' || Array.isArray(data)) {
      return [];
    }
    const id = record.id;
    const path = stringOrUndefined(record.path) ?? id;
    const subcollections = subcollectionsFromValue(record.subcollections);
    return [{
      id,
      path,
      data: data as Record<string, unknown>,
      hasSubcollections: typeof record.hasSubcollections === 'boolean'
        ? record.hasSubcollections
        : (subcollections?.length ?? 0) > 0,
      ...(subcollections ? { subcollections } : {}),
    }];
  });
}

export function queryPathForRows(rows: ReadonlyArray<FirestoreDocumentResult>): string {
  const path = rows[0]?.path;
  if (!path) return 'results';
  const parts = path.split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : 'results';
}

export function streamItemsFor(result: ScriptRunResult | null): ReadonlyArray<ScriptStreamItem> {
  if (!result || result.errors.length) return [];
  if (result.stream?.length) return result.stream;
  if (!isRenderableValue(result.returnValue)) return [];
  return [{
    id: 'return-value',
    label: 'return value',
    badge: valueSummary(result.returnValue),
    view: 'json',
    value: result.returnValue,
  }];
}

export function formatLogEntry(log: ScriptLogEntry): string {
  return `[${formatTime(log.timestamp)}] ${log.message}`;
}

export function toFirebaseError(error: ScriptRunResult['errors'][number]) {
  const record = error as ScriptRunResult['errors'][number] & {
    readonly code?: string;
    readonly name?: string;
  };
  return {
    name: record.name ?? 'Error',
    ...(record.code ? { code: record.code } : {}),
    message: error.message,
    ...(error.stack ? { stack: error.stack } : {}),
  };
}

function subcollectionsFromValue(
  value: unknown,
): ReadonlyArray<FirestoreCollectionNode> | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;
    const id = stringOrUndefined(record.id);
    const path = stringOrUndefined(record.path);
    if (!id || !path) return [];
    return [{ id, path }];
  });
}

function isRenderableValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  const valueType = typeof value;
  return valueType !== 'function' && valueType !== 'symbol';
}

function formatTime(timestamp: string): string {
  const isoTime = /T(?<time>\d{2}:\d{2}:\d{2})/.exec(timestamp)?.groups?.time;
  if (isoTime) return isoTime;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toISOString().slice(11, 19);
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function valueSummary(value: unknown): string {
  if (value === undefined) return '';
  if (value === null || Array.isArray(value)) return formatFirestoreValue(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['__type__'] === 'string') return formatFirestoreValue(value);
    if (typeof record.iso === 'string') return record.iso;
    if (typeof record.path === 'string') return record.path;
    return `Object(${Object.keys(record).length})`;
  }
  return String(value);
}
