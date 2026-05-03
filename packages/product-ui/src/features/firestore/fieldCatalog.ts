import type {
  FirestoreDocumentResult,
  FirestoreFieldCatalogEntry,
  FirestoreFieldCatalogs,
  FirestoreFieldType,
  FirestorePrimitiveFieldType,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import { useEffect, useMemo, useState } from 'react';
import { messageFromError } from '../../shared/errors.ts';
import { isPlainObject, primitiveCatalogTypeForValue } from './firestoreTypeRegistry.ts';
import { collectionLayoutKeyForPath } from './resultTableLayout.ts';

const FIELD_CATALOG_FIELD_LIMIT = 1_000;
const FIELD_CATALOG_VISIT_LIMIT = 2_000;
const FIELD_CATALOG_DEPTH_LIMIT = 3;

export function fieldCatalogKeyForPath(path: string): string {
  return collectionLayoutKeyForPath(path);
}

export function fieldCatalogFromRows(
  rows: ReadonlyArray<FirestoreDocumentResult>,
): FirestoreFieldCatalogEntry[] {
  const fields = new Map<string, { count: number; types: Set<FirestoreFieldType>; }>();
  const budget = { visits: 0 };
  for (const row of rows) {
    collectFields(row.data, '', fields, budget, 0);
    if (catalogBudgetExhausted(fields, budget)) break;
  }
  return sortedEntries(fields);
}

export function mergeFieldCatalogEntries(
  existing: ReadonlyArray<FirestoreFieldCatalogEntry>,
  observed: ReadonlyArray<FirestoreFieldCatalogEntry>,
): FirestoreFieldCatalogEntry[] {
  const fields = new Map<string, { count: number; types: Set<FirestoreFieldType>; }>();
  for (const entry of existing) {
    fields.set(entry.field, { count: entry.count, types: new Set(entry.types) });
  }
  for (const entry of observed) {
    const current = fields.get(entry.field) ?? { count: 0, types: new Set<FirestoreFieldType>() };
    for (const type of entry.types) current.types.add(type);
    fields.set(entry.field, { count: current.count + entry.count, types: current.types });
  }
  return sortedEntries(fields);
}

export function useFirestoreFieldCatalog(
  {
    onSettingsError,
    queryPath,
    rows,
    settings,
  }: {
    readonly onSettingsError?: ((message: string) => void) | undefined;
    readonly queryPath: string;
    readonly rows: ReadonlyArray<FirestoreDocumentResult>;
    readonly settings?: SettingsRepository | undefined;
  },
): ReadonlyArray<FirestoreFieldCatalogEntry> {
  const key = useMemo(() => fieldCatalogKeyForPath(queryPath), [queryPath]);
  const [catalogs, setCatalogs] = useState<FirestoreFieldCatalogs>({});

  useEffect(() => {
    if (!settings) {
      setCatalogs({});
      return;
    }
    let cancelled = false;
    settings.load().then((snapshot) => {
      if (!cancelled) setCatalogs(snapshot.firestoreFieldCatalogs);
    }).catch((error) => {
      if (!cancelled) {
        setCatalogs({});
        onSettingsError?.(messageFromError(error, 'Could not load field catalog settings.'));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onSettingsError, settings]);

  useEffect(() => {
    if (!settings || rows.length === 0) return;
    const observed = fieldCatalogFromRows(rows);
    if (!observed.length) return;
    let cancelled = false;
    settings.load()
      .then((snapshot) => {
        const currentEntries = snapshot.firestoreFieldCatalogs[key] ?? [];
        const mergedEntries = mergeFieldCatalogEntries(currentEntries, observed);
        if (catalogEntriesEqual(currentEntries, mergedEntries)) return snapshot;
        return settings.save({
          firestoreFieldCatalogs: {
            ...snapshot.firestoreFieldCatalogs,
            [key]: mergedEntries,
          },
        });
      })
      .then((snapshot) => {
        if (!cancelled) setCatalogs(snapshot.firestoreFieldCatalogs);
      })
      .catch((error) => {
        if (!cancelled) {
          onSettingsError?.(messageFromError(error, 'Could not save field catalog settings.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, onSettingsError, rows, settings]);

  return catalogs[key] ?? [];
}

function collectFields(
  value: Record<string, unknown>,
  prefix: string,
  fields: Map<string, { count: number; types: Set<FirestoreFieldType>; }>,
  budget: { visits: number; },
  depth: number,
) {
  if (depth > FIELD_CATALOG_DEPTH_LIMIT) return;
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    if (catalogBudgetExhausted(fields, budget)) return;
    budget.visits += 1;
    const entry = value[key];
    const field = prefix ? `${prefix}.${key}` : key;
    const primitiveType = primitiveFieldType(entry);
    if (primitiveType) {
      addField(fields, field, primitiveType);
      continue;
    }
    const arrayType = arrayFieldType(entry);
    if (arrayType) {
      addField(fields, field, arrayType);
      continue;
    }
    const nested = nestedRecord(entry);
    if (nested) collectFields(nested, field, fields, budget, depth + 1);
  }
}

function catalogBudgetExhausted(
  fields: ReadonlyMap<string, unknown>,
  budget: { readonly visits: number; },
): boolean {
  return fields.size >= FIELD_CATALOG_FIELD_LIMIT || budget.visits >= FIELD_CATALOG_VISIT_LIMIT;
}

function addField(
  fields: Map<string, { count: number; types: Set<FirestoreFieldType>; }>,
  field: string,
  type: FirestoreFieldType,
) {
  const current = fields.get(field) ?? { count: 0, types: new Set<FirestoreFieldType>() };
  current.types.add(type);
  fields.set(field, { count: current.count + 1, types: current.types });
}

function primitiveFieldType(value: unknown): FirestorePrimitiveFieldType | null {
  return primitiveCatalogTypeForValue(value);
}

function arrayFieldType(value: unknown): FirestoreFieldType | null {
  const entries = Array.isArray(value)
    ? value
    : isPlainObject(value) && value['__type__'] === 'array' && Array.isArray(value['value'])
    ? value['value']
    : null;
  if (!entries || entries.length === 0) return null;
  const types = new Set<FirestorePrimitiveFieldType>();
  for (const entry of entries) {
    const type = primitiveFieldType(entry);
    if (!type) return null;
    types.add(type);
  }
  if (types.size === 1) {
    const [type] = [...types];
    return type ? `array<${type}>` : null;
  }
  return 'array<mixed>';
}

function nestedRecord(value: unknown): Record<string, unknown> | null {
  if (!isPlainObject(value)) return null;
  if (value['__type__'] === 'map' && isPlainObject(value['value'])) return value['value'];
  if (typeof value['__type__'] === 'string') return null;
  return value;
}

function sortedEntries(
  fields: ReadonlyMap<string, { count: number; types: ReadonlySet<FirestoreFieldType>; }>,
): FirestoreFieldCatalogEntry[] {
  return mergeSortCatalogEntries(
    Array.from(fields, ([field, value]) => ({
      count: value.count,
      field,
      types: sortedTypes(value.types),
    })),
  );
}

function sortedTypes(types: ReadonlySet<FirestoreFieldType>): FirestoreFieldType[] {
  return sortedBy(types, (a, b) => a.localeCompare(b));
}

function mergeSortCatalogEntries(
  entries: ReadonlyArray<FirestoreFieldCatalogEntry>,
): FirestoreFieldCatalogEntry[] {
  if (entries.length < 2) return [...entries];
  const midpoint = Math.floor(entries.length / 2);
  return mergeCatalogEntries(
    mergeSortCatalogEntries(entries.slice(0, midpoint)),
    mergeSortCatalogEntries(entries.slice(midpoint)),
  );
}

function mergeCatalogEntries(
  left: ReadonlyArray<FirestoreFieldCatalogEntry>,
  right: ReadonlyArray<FirestoreFieldCatalogEntry>,
): FirestoreFieldCatalogEntry[] {
  const merged: FirestoreFieldCatalogEntry[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftEntry = left[leftIndex]!;
    const rightEntry = right[rightIndex]!;
    if (leftEntry.field.localeCompare(rightEntry.field) <= 0) {
      merged.push(leftEntry);
      leftIndex += 1;
    } else {
      merged.push(rightEntry);
      rightIndex += 1;
    }
  }
  return merged.concat(left.slice(leftIndex), right.slice(rightIndex));
}

function sortedBy<T>(items: Iterable<T>, compare: (left: T, right: T) => number): T[] {
  const sorted: T[] = [];
  for (const item of items) {
    const insertAt = sorted.findIndex((existing) => compare(item, existing) < 0);
    if (insertAt === -1) {
      sorted.push(item);
    } else {
      sorted.splice(insertAt, 0, item);
    }
  }
  return sorted;
}

function catalogEntriesEqual(
  left: ReadonlyArray<FirestoreFieldCatalogEntry>,
  right: ReadonlyArray<FirestoreFieldCatalogEntry>,
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    const l = left[i]!;
    const r = right[i]!;
    if (l.field !== r.field || l.count !== r.count) return false;
    if (l.types.length !== r.types.length) return false;
    for (let j = 0; j < l.types.length; j += 1) {
      if (l.types[j] !== r.types[j]) return false;
    }
  }
  return true;
}
