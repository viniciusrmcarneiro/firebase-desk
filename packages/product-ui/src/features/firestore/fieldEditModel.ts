import { encode, type NativeValue } from '@firebase-desk/data-format';
import {
  FIRESTORE_FIELD_PATH_SEGMENT_MAX_BYTES,
  utf8ByteLength,
} from '@firebase-desk/repo-contracts/firestore-field-patch';
import {
  editableTypeForValue as registryEditableTypeForValue,
  FIRESTORE_EDITABLE_TYPES as REGISTRY_FIRESTORE_EDITABLE_TYPES,
  type FirestoreEditableType as RegistryFirestoreEditableType,
  isJsonEditableType,
  isKnownEncodedFirestoreType,
  isPlainObject,
  labelForEditableType as registryLabelForEditableType,
  nativeFirestoreValueType,
} from './firestoreTypeRegistry.ts';

export type FirestoreEditableType = RegistryFirestoreEditableType;

export interface FieldEditTarget {
  readonly documentPath: string;
  readonly fieldPath: ReadonlyArray<string>;
  readonly value: unknown;
}

export interface FieldValueClassification {
  readonly editLabel: string;
  readonly jsonMode: boolean;
  readonly type: FirestoreEditableType;
}

export const FIRESTORE_EDITABLE_TYPES: ReadonlyArray<FirestoreEditableType> =
  REGISTRY_FIRESTORE_EDITABLE_TYPES;

export function classifyFieldValue(value: unknown): FieldValueClassification {
  const type = editableTypeForValue(value);
  const jsonMode = isJsonEditableType(type);
  return {
    editLabel: jsonMode ? 'Edit JSON' : `Edit ${labelForEditableType(type)}`,
    jsonMode,
    type,
  };
}

export function labelForEditableType(type: FirestoreEditableType): string {
  return registryLabelForEditableType(type);
}

export function editableTypeForValue(value: unknown): FirestoreEditableType {
  return registryEditableTypeForValue(value);
}

export function defaultValueForType(
  type: FirestoreEditableType,
  currentValue?: unknown,
): unknown {
  if (editableTypeForValue(currentValue) === type) return normalizeEditableValue(currentValue);
  switch (type) {
    case 'array':
      return [];
    case 'boolean':
      return false;
    case 'bytes':
      return { __type__: 'bytes', base64: '' };
    case 'geoPoint':
      return { __type__: 'geoPoint', latitude: 0, longitude: 0 };
    case 'map':
      return {};
    case 'null':
      return null;
    case 'number':
      return 0;
    case 'reference':
      return { __type__: 'reference', path: '' };
    case 'string':
      return '';
    case 'timestamp':
      return { __type__: 'timestamp', value: new Date(0).toISOString() };
  }
}

export function normalizeEditableValue(value: unknown): unknown {
  if (isNativeFirestoreScalar(value)) return encode(value as NativeValue);
  if (Array.isArray(value)) return value.map((entry) => normalizeEditableValue(entry));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, normalizeEditableValue(entry)]),
  );
}

export function parseJsonValue(source: string): unknown {
  return JSON.parse(source) as unknown;
}

export function parseDocumentJson(source: string): Record<string, unknown> {
  const value = parseJsonValue(source);
  if (isPlainObject(value)) return value;
  throw new Error('Document JSON must be an object.');
}

export function validateFirestoreDocumentData(data: Record<string, unknown>): void {
  validateFieldContainer(data, []);
}

export function validateFirestoreValue(value: unknown, path: ReadonlyArray<string> = []): void {
  if (
    value === null || typeof value === 'string' || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return;
  }
  if (isNativeFirestoreScalar(value)) {
    validateFirestoreValue(normalizeEditableValue(value), path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateFirestoreValue(entry, [...path, `[${index}]`]));
    return;
  }
  if (!isPlainObject(value)) {
    throw new Error(`${fieldPathLabel(path)} must be a JSON value.`);
  }
  const encodedType = value['__type__'];
  if (typeof encodedType === 'string') {
    validateEncodedValue(encodedType, value, path);
    return;
  }
  validateFieldContainer(value, path);
}

function isNativeFirestoreScalar(value: unknown): boolean {
  return nativeFirestoreValueType(value) !== null;
}

export function validateFieldName(name: string): void {
  if (!name) throw new Error('Field name is required.');
  if (/^__.*__$/.test(name)) throw new Error('Field name cannot match __.*__.');
  if (utf8ByteLength(name) > FIRESTORE_FIELD_PATH_SEGMENT_MAX_BYTES) {
    throw new Error('Field name must be 1,500 bytes or less.');
  }
}

export function setNestedFieldValue(
  data: Record<string, unknown>,
  fieldPath: ReadonlyArray<string>,
  value: unknown,
): Record<string, unknown> {
  assertFieldPath(fieldPath);
  const head = fieldPath[0]!;
  const rest = fieldPath.slice(1);
  const next = { ...data };
  if (!rest.length) {
    next[head] = value;
    return next;
  }
  const current = next[head];
  next[head] = setNestedFieldValue(isEditableMap(current) ? current : {}, rest, value);
  return next;
}

export function deleteNestedFieldValue(
  data: Record<string, unknown>,
  fieldPath: ReadonlyArray<string>,
): Record<string, unknown> {
  assertFieldPath(fieldPath);
  const head = fieldPath[0]!;
  const rest = fieldPath.slice(1);
  const next = { ...data };
  if (!rest.length) {
    delete next[head];
    return next;
  }
  const current = next[head];
  if (isEditableMap(current)) next[head] = deleteNestedFieldValue(current, rest);
  return next;
}

export function getNestedFieldValue(
  data: Record<string, unknown>,
  fieldPath: ReadonlyArray<string>,
): unknown {
  let current: unknown = data;
  for (const segment of fieldPath) {
    if (!isPlainObject(current)) return undefined;
    current = current[segment];
  }
  return current;
}

export function fieldPathLabel(fieldPath: ReadonlyArray<string>): string {
  return fieldPath.length ? fieldPath.join('.') : 'Field';
}

export function fieldPathFromTreeKey(
  fieldKey: string,
  parentPath: ReadonlyArray<string>,
): ReadonlyArray<string> | null {
  if (fieldKey.startsWith('[')) return null;
  return [...parentPath, fieldKey];
}

function validateFieldContainer(
  data: Record<string, unknown>,
  path: ReadonlyArray<string>,
): void {
  for (const [key, value] of Object.entries(data)) {
    validateFieldName(key);
    validateFirestoreValue(value, [...path, key]);
  }
}

function validateEncodedValue(
  encodedType: string,
  value: Record<string, unknown>,
  path: ReadonlyArray<string>,
): void {
  if (encodedType === 'truncated') {
    throw new Error(
      `${fieldPathLabel(path)} value was omitted from the result for performance. `
        + `Reload the document before saving.`,
    );
  }
  if (!isKnownEncodedFirestoreType(encodedType)) {
    throw new Error(`${fieldPathLabel(path)} has unknown __type__: ${encodedType}.`);
  }
  if (encodedType === 'timestamp') {
    const raw = value['value'];
    if (typeof raw !== 'string' || Number.isNaN(new Date(raw).getTime())) {
      throw new Error(`${fieldPathLabel(path)} timestamp must be an ISO string.`);
    }
    return;
  }
  if (encodedType === 'geoPoint') {
    if (!isFiniteNumber(value['latitude']) || !isFiniteNumber(value['longitude'])) {
      throw new Error(`${fieldPathLabel(path)} geoPoint must have numeric latitude and longitude.`);
    }
    return;
  }
  if (encodedType === 'reference') {
    if (typeof value['path'] !== 'string' || !value['path']) {
      throw new Error(`${fieldPathLabel(path)} reference must have a path.`);
    }
    validateReferencePath(value['path'], path);
    return;
  }
  if (encodedType === 'bytes') {
    if (typeof value['base64'] !== 'string' || !isBase64(value['base64'])) {
      throw new Error(`${fieldPathLabel(path)} bytes must have base64 data.`);
    }
    return;
  }
  if (encodedType === 'array') {
    const entries = value['value'];
    if (!Array.isArray(entries)) throw new Error(`${fieldPathLabel(path)} array value is invalid.`);
    entries.forEach((entry, index) => validateFirestoreValue(entry, [...path, `[${index}]`]));
    return;
  }
  const entries = value['value'];
  if (!isPlainObject(entries)) throw new Error(`${fieldPathLabel(path)} map value is invalid.`);
  validateFieldContainer(entries, path);
}

function assertFieldPath(fieldPath: ReadonlyArray<string>): void {
  if (!fieldPath.length) throw new Error('Field path is required.');
  for (const segment of fieldPath) validateFieldName(segment);
}

function isEditableMap(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && typeof value['__type__'] !== 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBase64(value: string): boolean {
  if (value === '') return true;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return false;
  return true;
}

function validateReferencePath(value: string, path: ReadonlyArray<string>): void {
  const segments = value.split('/');
  if (segments.some((segment) => segment.length === 0)) {
    throw new Error(`${fieldPathLabel(path)} reference must be a valid document path.`);
  }
  if (segments.length % 2 !== 0) {
    throw new Error(`${fieldPathLabel(path)} reference must point to a document path.`);
  }
}
