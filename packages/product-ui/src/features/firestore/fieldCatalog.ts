import {
  FirestoreBytes,
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
} from '@firebase-desk/data-format';
import type {
  FirestoreDocumentResult,
  FirestoreFieldCatalogEntry,
  FirestoreFieldCatalogs,
  FirestoreFieldType,
  FirestorePrimitiveFieldType,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import { useEffect, useMemo, useState } from 'react';
import { collectionLayoutKeyForPath } from './resultTableLayout.ts';

export function fieldCatalogKeyForPath(path: string): string {
  return collectionLayoutKeyForPath(path);
}

export function fieldCatalogFromRows(
  rows: ReadonlyArray<FirestoreDocumentResult>,
): FirestoreFieldCatalogEntry[] {
  const fields = new Map<string, { count: number; types: Set<FirestoreFieldType>; }>();
  for (const row of rows) {
    collectFields(row.data, '', fields);
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
    queryPath,
    rows,
    settings,
  }: {
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
    }).catch(() => {
      if (!cancelled) setCatalogs({});
    });
    return () => {
      cancelled = true;
    };
  }, [settings]);

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
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key, rows, settings]);

  return catalogs[key] ?? [];
}

function collectFields(
  value: Record<string, unknown>,
  prefix: string,
  fields: Map<string, { count: number; types: Set<FirestoreFieldType>; }>,
) {
  for (const [key, entry] of Object.entries(value)) {
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
    if (nested) collectFields(nested, field, fields);
  }
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
  if (value === null) return 'null';
  if (value instanceof FirestoreTimestamp) return 'timestamp';
  if (value instanceof FirestoreGeoPoint) return 'geoPoint';
  if (value instanceof FirestoreReference) return 'reference';
  if (value instanceof FirestoreBytes) return 'bytes';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (!isPlainObject(value)) return null;
  switch (value['__type__']) {
    case 'timestamp':
      return 'timestamp';
    case 'geoPoint':
      return 'geoPoint';
    case 'reference':
      return 'reference';
    case 'bytes':
      return 'bytes';
    default:
      return null;
  }
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
  return sortedBy(
    Array.from(fields, ([field, value]) => ({
      count: value.count,
      field,
      types: sortedTypes(value.types),
    })),
    (a, b) => a.field.localeCompare(b.field),
  );
}

function sortedTypes(types: ReadonlySet<FirestoreFieldType>): FirestoreFieldType[] {
  return sortedBy(types, (a, b) => a.localeCompare(b));
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
  return JSON.stringify(left) === JSON.stringify(right);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
