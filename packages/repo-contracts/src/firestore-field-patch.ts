import type { FirestoreFieldPatchOperation } from './firestore.ts';

export const FIRESTORE_FIELD_PATH_SEGMENT_MAX_BYTES = 1500;

export function applyFirestoreFieldPatchOperation(
  data: Record<string, unknown>,
  operation: FirestoreFieldPatchOperation,
): Record<string, unknown> {
  return operation.type === 'delete'
    ? deleteNestedValue(data, operation.fieldPath)
    : setNestedValue(data, operation.fieldPath, operation.value);
}

export function setNestedValue(
  data: Record<string, unknown>,
  fieldPath: ReadonlyArray<string>,
  value: unknown,
): Record<string, unknown> {
  const [head, ...rest] = fieldPath;
  if (!head) return data;
  const next = { ...data };
  if (!rest.length) {
    next[head] = value;
    return next;
  }
  next[head] = setNestedValue(isPlainRecord(next[head]) ? next[head] : {}, rest, value);
  return next;
}

export function deleteNestedValue(
  data: Record<string, unknown>,
  fieldPath: ReadonlyArray<string>,
): Record<string, unknown> {
  const [head, ...rest] = fieldPath;
  if (!head) return data;
  const next = { ...data };
  if (!rest.length) {
    delete next[head];
    return next;
  }
  if (isPlainRecord(next[head])) next[head] = deleteNestedValue(next[head], rest);
  return next;
}

export function fieldPatchHasChangedRemoteValue(
  remoteData: Record<string, unknown>,
  operations: ReadonlyArray<FirestoreFieldPatchOperation>,
): boolean {
  return operations.some((operation) =>
    !deepEqualJson(getNestedValue(remoteData, operation.fieldPath), operation.baseValue)
  );
}

export function getNestedValue(
  data: Record<string, unknown>,
  fieldPath: ReadonlyArray<string>,
): unknown {
  let current: unknown = data;
  for (const segment of fieldPath) {
    if (!isPlainRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

export function deepEqualJson(left: unknown, right: unknown): boolean {
  return stableJsonString(left) === stableJsonString(right);
}

export function stableJsonString(value: unknown): string {
  return JSON.stringify(stableJsonValue(value, new WeakSet<object>())) ?? 'undefined';
}

export function stableJsonValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error('Cannot compare circular JSON values.');
    seen.add(value);
    const next = value.map((entry) => stableJsonValue(entry, seen));
    seen.delete(value);
    return next;
  }
  if (!isPlainRecord(value)) return value;
  if (seen.has(value)) throw new Error('Cannot compare circular JSON values.');
  seen.add(value);
  const sorted = Object.fromEntries(
    sortedEntriesByKey(value).map(([key, entry]) => [key, stableJsonValue(entry, seen)]),
  );
  seen.delete(value);
  return sorted;
}

export function sortedEntriesByKey(
  value: Record<string, unknown>,
): ReadonlyArray<[string, unknown]> {
  const sorted: Array<[string, unknown]> = [];
  for (const entry of Object.entries(value)) {
    const index = sorted.findIndex(([key]) => entry[0].localeCompare(key) < 0);
    if (index < 0) sorted.push(entry);
    else sorted.splice(index, 0, entry);
  }
  return sorted;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index) ?? 0;
    if (codePoint > 0xffff) index += 1;
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}
