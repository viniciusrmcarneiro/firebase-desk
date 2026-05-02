import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
} from '@firebase-desk/repo-contracts';
import type { ExplorerTreeRowModel } from '@firebase-desk/ui';
import { FileJson, FileText, Folder } from 'lucide-react';
import {
  firestoreValueType,
  formatFirestoreValue,
  isFirestoreTypedValue,
} from './FirestoreValueCell.tsx';
import { sortedObjectEntries } from './sortedJson.ts';

export interface FieldCatalogItem {
  readonly count: number;
  readonly field: string;
  readonly types: ReadonlyArray<string>;
}

export interface SubcollectionLoadState {
  readonly status: 'error' | 'loading' | 'success';
  readonly errorMessage?: string;
  readonly items?: ReadonlyArray<FirestoreCollectionNode>;
}

export const MAX_SUBCOLLECTION_CHIPS = 10;

const TREE_FIELD_SORT_LIMIT = 500;
export const TREE_VALUE_CHILD_BATCH_SIZE = 100;

export type ResultTreeNodeKind =
  | 'branch'
  | 'leaf'
  | 'load-more'
  | 'load-subcollections'
  | 'load-value-children';

export interface ResultTreeRowModel extends ExplorerTreeRowModel {
  readonly documentPath?: string;
  readonly errorMessage?: string;
  readonly fieldPath?: ReadonlyArray<string>;
  readonly fieldValue?: unknown;
  readonly kind: ResultTreeNodeKind;
  readonly openPath?: string;
  readonly subcollectionStatus?: SubcollectionLoadState['status'] | 'idle';
  readonly valueChildLimitTargetId?: string;
}

export function fieldCatalogForRows(
  rows: ReadonlyArray<FirestoreDocumentResult>,
): ReadonlyArray<FieldCatalogItem> {
  const counts = new Map<string, { count: number; types: Set<string>; }>();
  for (const row of rows) {
    for (const [field, value] of Object.entries(row.data)) {
      const current = counts.get(field) ?? { count: 0, types: new Set<string>() };
      current.types.add(valueType(value));
      counts.set(field, { count: current.count + 1, types: current.types });
    }
  }
  return mergeSortFieldCatalogItems(Array.from(counts, ([field, value]) => ({
    count: value.count,
    field,
    types: sortedStrings(value.types),
  })));
}

export function flattenResultTree(
  queryPath: string,
  rows: ReadonlyArray<FirestoreDocumentResult>,
  hasMore: boolean,
  expandedIds: ReadonlySet<string>,
  subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>,
  canLoadSubcollections: boolean,
  valueChildLimits: ReadonlyMap<string, number> = new Map(),
): ReadonlyArray<ResultTreeRowModel> {
  const flattened: ResultTreeRowModel[] = [];
  const rootId = `root:${queryPath}`;
  const rootExpanded = expandedIds.has(rootId);
  flattened.push({
    id: rootId,
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: queryPath || 'query',
    level: 0,
    meta: isCollectionPath(queryPath) ? 'Collection' : 'Document',
    hasChildren: rows.length > 0 || hasMore,
    expanded: rootExpanded,
  });
  if (!rootExpanded) return flattened;
  for (const row of rows) {
    appendDocumentTreeRows(
      flattened,
      row,
      1,
      expandedIds,
      subcollectionStates,
      canLoadSubcollections,
      valueChildLimits,
    );
  }
  if (hasMore) {
    flattened.push({
      id: `${rootId}:load-more`,
      icon: <FileJson size={14} aria-hidden='true' />,
      kind: 'load-more',
      label: 'Load more',
      level: 1,
      meta: 'More',
    });
  }
  return flattened;
}

export function toggleSet(values: ReadonlySet<string>, value: string): ReadonlySet<string> {
  const next = new Set(values);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function mergeLoadedSubcollections(
  document: FirestoreDocumentResult,
  state?: SubcollectionLoadState,
): FirestoreDocumentResult;
export function mergeLoadedSubcollections(
  document: FirestoreDocumentResult | null,
  state?: SubcollectionLoadState,
): FirestoreDocumentResult | null;
export function mergeLoadedSubcollections(
  document: FirestoreDocumentResult | null,
  state?: SubcollectionLoadState,
): FirestoreDocumentResult | null {
  if (!document || state?.status !== 'success') return document;
  const items = state.items ?? [];
  return {
    ...document,
    hasSubcollections: items.length > 0,
    subcollections: items,
  };
}

export function documentsForCollectionNode(
  collection: FirestoreCollectionNode,
): ReadonlyArray<FirestoreDocumentResult> {
  const withDocuments = collection as FirestoreCollectionNode & {
    readonly documents?: ReadonlyArray<FirestoreDocumentResult>;
  };
  return withDocuments.documents ?? [];
}

export function findDocumentByPath(
  documents: ReadonlyArray<FirestoreDocumentResult>,
  path: string,
): FirestoreDocumentResult | null {
  for (const document of documents) {
    if (document.path === path) return document;
    for (const collection of document.subcollections ?? []) {
      const nested = findDocumentByPath(documentsForCollectionNode(collection), path);
      if (nested) return nested;
    }
  }
  return null;
}

export function subcollectionLoadLabel(
  status?: SubcollectionLoadState['status'] | 'idle',
): string {
  if (status === 'loading') return 'Loading';
  if (status === 'error') return 'Retry';
  return 'Load';
}

export function subcollectionLoadMeta(state?: SubcollectionLoadState): string {
  if (state?.status === 'loading') return 'loading';
  if (state?.status === 'error') return 'error';
  return 'unknown';
}

export function subcollectionLoadValue(state?: SubcollectionLoadState): string {
  if (state?.status === 'loading') return 'loading';
  if (state?.status === 'error') return state.errorMessage ?? 'load failed';
  return 'not loaded';
}

export function isCollectionPath(path: string): boolean {
  const parts = path.split('/').filter(Boolean);
  return parts.length % 2 === 1;
}

function appendDocumentTreeRows(
  flattened: ResultTreeRowModel[],
  row: FirestoreDocumentResult,
  level: number,
  expandedIds: ReadonlySet<string>,
  subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>,
  canLoadSubcollections: boolean,
  valueChildLimits: ReadonlyMap<string, number>,
) {
  const nodeId = `doc:${row.path}`;
  const expanded = expandedIds.has(nodeId);
  flattened.push({
    id: nodeId,
    documentPath: row.path,
    icon: <FileText size={14} aria-hidden='true' />,
    kind: 'branch',
    label: row.id,
    level,
    meta: 'Document',
    hasChildren: true,
    expanded,
    openPath: row.path,
  });
  if (!expanded) return;
  const fieldCount = Object.keys(row.data).length;
  const fieldsId = `${nodeId}:fields`;
  const fieldsExpanded = expandedIds.has(fieldsId);
  flattened.push({
    id: fieldsId,
    documentPath: row.path,
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: 'Fields',
    level: level + 1,
    meta: 'Group',
    value: `${fieldCount} field${fieldCount === 1 ? '' : 's'}`,
    hasChildren: fieldCount > 0,
    expanded: fieldsExpanded,
  });
  if (fieldsExpanded) {
    const fields = fieldEntriesForTree(row.data, fieldCount);
    for (const [key, value] of fields) {
      appendValueTreeRows(
        flattened,
        key,
        value,
        level + 2,
        `${fieldsId}:field`,
        expandedIds,
        row.path,
        [],
        true,
        valueChildLimits,
      );
    }
    if (fields.length < fieldCount) {
      flattened.push({
        id: `${fieldsId}:field-overflow`,
        documentPath: row.path,
        icon: <FileJson size={14} aria-hidden='true' />,
        kind: 'leaf',
        label: `${fieldCount - fields.length} more fields`,
        level: level + 2,
        meta: 'Hidden',
        value: 'Open document to inspect all fields',
      });
    }
  }
  appendSubcollectionTreeRows(
    flattened,
    row,
    level + 1,
    expandedIds,
    subcollectionStates,
    canLoadSubcollections,
    valueChildLimits,
  );
}

function appendSubcollectionTreeRows(
  flattened: ResultTreeRowModel[],
  row: FirestoreDocumentResult,
  level: number,
  expandedIds: ReadonlySet<string>,
  subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>,
  canLoadSubcollections: boolean,
  valueChildLimits: ReadonlyMap<string, number>,
) {
  const nodeId = `doc:${row.path}`;
  const groupId = `${nodeId}:subcollections`;
  if (row.subcollections === undefined) {
    if (!row.hasSubcollections) return;
    const state = subcollectionStates[row.path];
    flattened.push({
      id: groupId,
      icon: <Folder size={14} aria-hidden='true' />,
      kind: canLoadSubcollections && row.hasSubcollections ? 'load-subcollections' : 'leaf',
      label: 'Subcollections',
      level,
      meta: row.hasSubcollections ? subcollectionLoadMeta(state) : 'empty',
      value: row.hasSubcollections ? subcollectionLoadValue(state) : 'none',
      documentPath: row.path,
      ...(state?.errorMessage ? { errorMessage: state.errorMessage } : {}),
      subcollectionStatus: state?.status ?? 'idle',
    });
    return;
  }
  if (row.subcollections.length === 0) return;
  const groupExpanded = expandedIds.has(groupId);
  flattened.push({
    id: groupId,
    documentPath: row.path,
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: 'Subcollections',
    level,
    meta: 'Group',
    value: `${row.subcollections.length} item${row.subcollections.length === 1 ? '' : 's'}`,
    hasChildren: true,
    expanded: groupExpanded,
  });
  if (!groupExpanded) return;
  for (const collection of row.subcollections) {
    const collectionId = `collection:${collection.path}`;
    const collectionExpanded = expandedIds.has(collectionId);
    const documents = documentsForCollectionNode(collection);
    flattened.push({
      id: collectionId,
      documentPath: row.path,
      icon: <Folder size={14} aria-hidden='true' />,
      kind: documents.length > 0 ? 'branch' : 'leaf',
      label: collection.id,
      level: level + 1,
      meta: 'Subcollection',
      hasChildren: documents.length > 0,
      expanded: collectionExpanded,
      openPath: collection.path,
    });
    if (documents.length && collectionExpanded) {
      for (const document of documents) {
        appendDocumentTreeRows(
          flattened,
          document,
          level + 2,
          expandedIds,
          subcollectionStates,
          canLoadSubcollections,
          valueChildLimits,
        );
      }
    }
  }
}

function appendValueTreeRows(
  flattened: ResultTreeRowModel[],
  key: string,
  value: unknown,
  level: number,
  parentId: string,
  expandedIds: ReadonlySet<string>,
  documentPath: string,
  parentFieldPath: ReadonlyArray<string>,
  canEditFieldPath: boolean,
  valueChildLimits: ReadonlyMap<string, number>,
) {
  const nodeId = `${parentId}:${key}`;
  const fieldPath = canEditFieldPath && !key.startsWith('[') ? [...parentFieldPath, key] : null;
  const childCanEditFieldPath = canEditFieldPath && !key.startsWith('[');
  if (!isExpandableValue(value)) {
    flattened.push({
      id: nodeId,
      documentPath,
      ...(fieldPath ? { fieldPath, fieldValue: value } : {}),
      icon: <FileJson size={14} aria-hidden='true' />,
      kind: 'leaf',
      label: key,
      level,
      meta: valueType(value),
      value: formatValue(value),
    });
    return;
  }
  const expanded = expandedIds.has(nodeId);
  const hasChildren = expandableHasChildren(value);
  flattened.push({
    id: nodeId,
    documentPath,
    ...(fieldPath ? { fieldPath, fieldValue: value } : {}),
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: key,
    level,
    meta: valueType(value),
    value: formatValue(value),
    hasChildren,
    expanded,
  });
  if (!expanded) return;
  const limit = valueChildLimits.get(nodeId) ?? TREE_VALUE_CHILD_BATCH_SIZE;
  const { entries, hasMore, remaining } = expandableEntryWindow(value, limit);
  for (const [childKey, childValue] of entries) {
    appendValueTreeRows(
      flattened,
      childKey,
      childValue,
      level + 1,
      nodeId,
      expandedIds,
      documentPath,
      fieldPath ?? parentFieldPath,
      childCanEditFieldPath,
      valueChildLimits,
    );
  }
  if (hasMore) {
    flattened.push({
      id: `${nodeId}:value-children-more`,
      documentPath,
      icon: <FileJson size={14} aria-hidden='true' />,
      kind: 'load-value-children',
      label: remaining === null
        ? 'More entries'
        : `${remaining} more item${remaining === 1 ? '' : 's'}`,
      level: level + 1,
      meta: 'More',
      value: `${entries.length} shown`,
      valueChildLimitTargetId: nodeId,
    });
  }
}

function fieldEntriesForTree(
  data: Record<string, unknown>,
  fieldCount: number,
): ReadonlyArray<readonly [string, unknown]> {
  if (fieldCount > TREE_FIELD_SORT_LIMIT) {
    return firstObjectEntries(data, TREE_FIELD_SORT_LIMIT);
  }
  return sortedObjectEntries(data);
}

function firstObjectEntries(
  value: Record<string, unknown>,
  limit: number,
): ReadonlyArray<readonly [string, unknown]> {
  const entries: Array<readonly [string, unknown]> = [];
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    if (entries.length >= limit) break;
    entries.push([key, value[key]] as const);
  }
  return entries;
}

function expandableHasChildren(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  const encoded = encodedExpandableValue(value);
  if (encoded) return expandableHasChildren(encoded);
  if (value !== null && typeof value === 'object') {
    for (const key in value as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(value, key)) return true;
    }
  }
  return false;
}

function expandableEntryWindow(
  value: unknown,
  limit: number,
): {
  readonly entries: ReadonlyArray<readonly [string, unknown]>;
  readonly hasMore: boolean;
  readonly remaining: number | null;
} {
  const encoded = encodedExpandableValue(value);
  if (encoded) return expandableEntryWindow(encoded, limit);
  if (Array.isArray(value)) {
    const entries = value.slice(0, limit).map((entry, index) => [`[${index}]`, entry] as const);
    return {
      entries,
      hasMore: value.length > limit,
      remaining: value.length > limit ? value.length - limit : 0,
    };
  }
  const entries: Array<readonly [string, unknown]> = [];
  let hasMore = false;
  for (const key in value as Record<string, unknown>) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    if (entries.length >= limit) {
      hasMore = true;
      break;
    }
    entries.push([key, (value as Record<string, unknown>)[key]] as const);
  }
  return {
    entries: hasMore ? entries : mergeSortEntryWindow(entries),
    hasMore,
    remaining: null,
  };
}

function mergeSortEntryWindow(
  entries: ReadonlyArray<readonly [string, unknown]>,
): ReadonlyArray<readonly [string, unknown]> {
  if (entries.length < 2) return entries;
  const midpoint = Math.floor(entries.length / 2);
  return mergeEntryWindow(
    mergeSortEntryWindow(entries.slice(0, midpoint)),
    mergeSortEntryWindow(entries.slice(midpoint)),
  );
}

function mergeEntryWindow(
  left: ReadonlyArray<readonly [string, unknown]>,
  right: ReadonlyArray<readonly [string, unknown]>,
): ReadonlyArray<readonly [string, unknown]> {
  const merged: Array<readonly [string, unknown]> = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftEntry = left[leftIndex]!;
    const rightEntry = right[rightIndex]!;
    if (leftEntry[0].localeCompare(rightEntry[0]) <= 0) {
      merged.push(leftEntry);
      leftIndex += 1;
    } else {
      merged.push(rightEntry);
      rightIndex += 1;
    }
  }
  return merged.concat(left.slice(leftIndex), right.slice(rightIndex));
}

function encodedExpandableValue(value: unknown): unknown[] | Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const type = (value as { readonly __type__?: unknown; }).__type__;
  const entries = (value as { readonly value?: unknown; }).value;
  if (
    type === 'map' && entries !== null && typeof entries === 'object' && !Array.isArray(entries)
  ) {
    return entries as Record<string, unknown>;
  }
  if (type === 'array' && Array.isArray(entries)) return entries;
  return null;
}

function sortedStrings(values: ReadonlySet<string>): ReadonlyArray<string> {
  return Array.from(values).reduce<ReadonlyArray<string>>((sorted, value) => {
    const index = sorted.findIndex((item) => value.localeCompare(item) < 0);
    if (index < 0) return [...sorted, value];
    return [...sorted.slice(0, index), value, ...sorted.slice(index)];
  }, []);
}

function mergeSortFieldCatalogItems(
  items: ReadonlyArray<FieldCatalogItem>,
): ReadonlyArray<FieldCatalogItem> {
  if (items.length < 2) return items;
  const midpoint = Math.floor(items.length / 2);
  return mergeFieldCatalogItems(
    mergeSortFieldCatalogItems(items.slice(0, midpoint)),
    mergeSortFieldCatalogItems(items.slice(midpoint)),
  );
}

function mergeFieldCatalogItems(
  left: ReadonlyArray<FieldCatalogItem>,
  right: ReadonlyArray<FieldCatalogItem>,
): ReadonlyArray<FieldCatalogItem> {
  const merged: FieldCatalogItem[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftItem = left[leftIndex]!;
    const rightItem = right[rightIndex]!;
    if (leftItem.field.localeCompare(rightItem.field) <= 0) {
      merged.push(leftItem);
      leftIndex += 1;
    } else {
      merged.push(rightItem);
      rightIndex += 1;
    }
  }
  return merged.concat(left.slice(leftIndex), right.slice(rightIndex));
}

function isExpandableValue(value: unknown): boolean {
  if (encodedExpandableValue(value)) return true;
  return value !== null && typeof value === 'object' && !isFirestoreTypedValue(value);
}

function valueType(value: unknown): string {
  return firestoreValueType(value);
}

function formatValue(value: unknown): string {
  return formatFirestoreValue(value);
}
