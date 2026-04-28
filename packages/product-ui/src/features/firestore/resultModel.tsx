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

export type ResultTreeNodeKind = 'branch' | 'leaf' | 'load-more' | 'load-subcollections';

export interface ResultTreeRowModel extends ExplorerTreeRowModel {
  readonly documentPath?: string;
  readonly errorMessage?: string;
  readonly kind: ResultTreeNodeKind;
  readonly openPath?: string;
  readonly subcollectionStatus?: SubcollectionLoadState['status'] | 'idle';
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
  return Array.from(counts, ([field, value]) => ({
    count: value.count,
    field,
    types: sortedStrings(value.types),
  })).reduce<ReadonlyArray<FieldCatalogItem>>((sorted, item) => insertField(sorted, item), []);
}

export function flattenResultTree(
  queryPath: string,
  rows: ReadonlyArray<FirestoreDocumentResult>,
  hasMore: boolean,
  expandedIds: ReadonlySet<string>,
  subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>,
  canLoadSubcollections: boolean,
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

export function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function appendDocumentTreeRows(
  flattened: ResultTreeRowModel[],
  row: FirestoreDocumentResult,
  level: number,
  expandedIds: ReadonlySet<string>,
  subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>,
  canLoadSubcollections: boolean,
) {
  const nodeId = `doc:${row.path}`;
  const expanded = expandedIds.has(nodeId);
  flattened.push({
    id: nodeId,
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
  const fields = Object.entries(row.data);
  const fieldsId = `${nodeId}:fields`;
  const fieldsExpanded = expandedIds.has(fieldsId);
  flattened.push({
    id: fieldsId,
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: 'Fields',
    level: level + 1,
    meta: 'Group',
    value: `${fields.length} field${fields.length === 1 ? '' : 's'}`,
    hasChildren: fields.length > 0,
    expanded: fieldsExpanded,
  });
  if (fieldsExpanded) {
    for (const [key, value] of fields) {
      appendValueTreeRows(flattened, key, value, level + 2, `${fieldsId}:field`, expandedIds);
    }
  }
  appendSubcollectionTreeRows(
    flattened,
    row,
    level + 1,
    expandedIds,
    subcollectionStates,
    canLoadSubcollections,
  );
}

function appendSubcollectionTreeRows(
  flattened: ResultTreeRowModel[],
  row: FirestoreDocumentResult,
  level: number,
  expandedIds: ReadonlySet<string>,
  subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>,
  canLoadSubcollections: boolean,
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
      ...(canLoadSubcollections && row.hasSubcollections ? { documentPath: row.path } : {}),
      ...(state?.errorMessage ? { errorMessage: state.errorMessage } : {}),
      subcollectionStatus: state?.status ?? 'idle',
    });
    return;
  }
  if (row.subcollections.length === 0) return;
  const groupExpanded = expandedIds.has(groupId);
  flattened.push({
    id: groupId,
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
) {
  const nodeId = `${parentId}:${key}`;
  if (!isExpandableValue(value)) {
    flattened.push({
      id: nodeId,
      icon: <FileJson size={14} aria-hidden='true' />,
      kind: 'leaf',
      label: key,
      level,
      meta: valueType(value),
      value: formatValue(value),
    });
    return;
  }
  const entries = Array.isArray(value)
    ? value.map((entry, index) => [`[${index}]`, entry] as const)
    : Object.entries(value as Record<string, unknown>);
  const expanded = expandedIds.has(nodeId);
  flattened.push({
    id: nodeId,
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: key,
    level,
    meta: valueType(value),
    hasChildren: entries.length > 0,
    expanded,
  });
  if (!expanded) return;
  for (const [childKey, childValue] of entries) {
    appendValueTreeRows(flattened, childKey, childValue, level + 1, nodeId, expandedIds);
  }
}

function insertField(
  fields: ReadonlyArray<FieldCatalogItem>,
  item: FieldCatalogItem,
): ReadonlyArray<FieldCatalogItem> {
  const index = fields.findIndex((field) => item.field.localeCompare(field.field) < 0);
  if (index < 0) return [...fields, item];
  return [...fields.slice(0, index), item, ...fields.slice(index)];
}

function sortedStrings(values: ReadonlySet<string>): ReadonlyArray<string> {
  return Array.from(values).reduce<ReadonlyArray<string>>((sorted, value) => {
    const index = sorted.findIndex((item) => value.localeCompare(item) < 0);
    if (index < 0) return [...sorted, value];
    return [...sorted.slice(0, index), value, ...sorted.slice(index)];
  }, []);
}

function isExpandableValue(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !isFirestoreTypedValue(value);
}

function valueType(value: unknown): string {
  return firestoreValueType(value);
}

function formatValue(value: unknown): string {
  return formatFirestoreValue(value);
}
