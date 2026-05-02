import type { IpcRequest, IpcResponse } from '@firebase-desk/ipc-schemas';
import type {
  AuthUser,
  FirestoreCollectionNode,
  FirestoreDocumentNode,
  FirestoreDocumentResult,
  FirestoreFieldPatchOperation,
  FirestoreQuery,
  FirestoreRepository,
  FirestoreSaveDocumentOptions,
  FirestoreSaveDocumentResult,
  Page,
  PageRequest,
  ScriptRunEvent,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';

export function toPageRequest(
  request?: {
    readonly cursor?: { readonly token: string; } | undefined;
    readonly limit?: number | undefined;
  },
): PageRequest | undefined {
  if (!request) return undefined;
  return {
    ...(request.limit !== undefined ? { limit: request.limit } : {}),
    ...(request.cursor !== undefined ? { cursor: { token: request.cursor.token } } : {}),
  };
}

export function toIpcAuthUserPage(page: Page<AuthUser>): IpcResponse<'auth.listUsers'> {
  return {
    items: page.items.map(toIpcAuthUser),
    nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
  };
}

export function toIpcAuthUser(user: AuthUser): NonNullable<IpcResponse<'auth.getUser'>> {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    provider: user.provider,
    disabled: user.disabled,
    customClaims: { ...user.customClaims },
  };
}

export function toFirestoreQuery(query: IpcRequest<'firestore.runQuery'>['query']): FirestoreQuery {
  return {
    connectionId: query.connectionId,
    path: query.path,
    ...(query.filters !== undefined
      ? { filters: query.filters.map((filter) => ({ ...filter })) }
      : {}),
    ...(query.sorts !== undefined ? { sorts: query.sorts.map((sort) => ({ ...sort })) } : {}),
  };
}

export function toIpcCollections(
  collections: ReadonlyArray<FirestoreCollectionNode>,
): IpcResponse<'firestore.listRootCollections'> {
  return collections.map(toIpcCollectionNode);
}

export function toIpcCollectionNode(
  collection: FirestoreCollectionNode,
): IpcResponse<'firestore.listRootCollections'>[number] {
  return {
    id: collection.id,
    path: collection.path,
    ...(collection.documentCount !== undefined ? { documentCount: collection.documentCount } : {}),
  };
}

export function toIpcDocumentPage(
  page: Page<FirestoreDocumentNode>,
): IpcResponse<'firestore.listDocuments'> {
  return {
    items: page.items.map((document) => ({
      id: document.id,
      path: document.path,
      hasSubcollections: document.hasSubcollections,
    })),
    nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
  };
}

export function toSaveDocumentOptions(
  options?: { readonly lastUpdateTime?: string | undefined; },
): FirestoreSaveDocumentOptions | undefined {
  return options?.lastUpdateTime ? { lastUpdateTime: options.lastUpdateTime } : undefined;
}

export function toFieldPatchOperation(
  operation: IpcRequest<'firestore.updateDocumentFields'>['operations'][number],
): FirestoreFieldPatchOperation {
  return operation.type === 'delete'
    ? {
      baseValue: operation.baseValue,
      fieldPath: operation.fieldPath,
      type: 'delete',
    }
    : {
      baseValue: operation.baseValue,
      fieldPath: operation.fieldPath,
      type: 'set',
      value: operation.value,
    };
}

// Threshold (bytes) above which a single field value is shortened in runQuery results.
// Scalar values become a marker; maps/arrays keep a bounded expandable preview.
// Override via FIREBASE_DESK_RUN_QUERY_FIELD_BUDGET_BYTES (used by tests).
const RUN_QUERY_FIELD_BUDGET_BYTES = readFieldBudget();
const RUN_QUERY_CONTAINER_ENTRY_LIMIT = 500;
const RUN_QUERY_NESTED_CONTAINER_ENTRY_LIMIT = 100;
const RUN_QUERY_CONTAINER_CHILD_BUDGET_BYTES = 8 * 1024;
const TRUNCATED_CHILD_KEY = '[truncated]';

export function toIpcResultPage(
  page: Page<FirestoreDocumentResult>,
): IpcResponse<'firestore.runQuery'> {
  return {
    items: page.items.map((document) =>
      toIpcDocumentResult(document, { truncateLargeFields: true })
    ),
    nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
  };
}

export function toIpcDocumentResult(
  document: FirestoreDocumentResult,
  options?: { readonly truncateLargeFields?: boolean; },
): NonNullable<IpcResponse<'firestore.getDocument'>> {
  const data = options?.truncateLargeFields
    ? truncateLargeFieldValues(document.data, RUN_QUERY_FIELD_BUDGET_BYTES)
    : document.data;
  return {
    id: document.id,
    path: document.path,
    data,
    hasSubcollections: document.hasSubcollections,
    ...(document.subcollections
      ? { subcollections: document.subcollections.map(toIpcCollectionNode) }
      : {}),
    ...(document.updateTime ? { updateTime: document.updateTime } : {}),
  };
}

export function truncateLargeFieldValues(
  data: Record<string, unknown>,
  budget: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field in data) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) continue;
    const value = data[field];
    const size = estimateValueBytes(value, budget);
    out[field] = size > budget ? previewLargeValue(value, budget, size) : value;
  }
  return out;
}

function previewLargeValue(
  value: unknown,
  budget: number,
  sizeBytes: number,
  depth = 0,
): unknown {
  if (Array.isArray(value)) {
    return previewArray(value, budget, sizeBytes, depth);
  }
  if (isPlainObject(value)) {
    const type = typeof value['__type__'] === 'string' ? value['__type__'] : null;
    if (type === 'map' && isPlainObject(value['value'])) {
      return { __type__: 'map', value: previewObject(value['value'], budget, sizeBytes, depth) };
    }
    if (type === 'array' && Array.isArray(value['value'])) {
      return { __type__: 'array', value: previewArray(value['value'], budget, sizeBytes, depth) };
    }
    if (!isEncodedScalarType(type)) return previewObject(value, budget, sizeBytes, depth);
  }
  return truncatedMarker(value, sizeBytes);
}

function isEncodedScalarType(type: string | null): boolean {
  return type === 'timestamp' || type === 'geoPoint' || type === 'reference'
    || type === 'bytes' || type === 'truncated';
}

function previewObject(
  value: Record<string, unknown>,
  budget: number,
  sizeBytes: number,
  depth: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const entryLimit = containerEntryLimit(depth);
  let entries = 0;
  let truncated = false;
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    if (entries >= entryLimit) {
      truncated = true;
      break;
    }
    const child = value[key];
    const childBudget = childPreviewBudget(budget);
    const childSize = estimateValueBytes(child, childBudget);
    out[key] = previewChildValue(child, childBudget, childSize, depth + 1);
    entries += 1;
  }
  if (truncated) out[TRUNCATED_CHILD_KEY] = truncatedMarker(value, sizeBytes);
  return out;
}

function previewArray(
  value: ReadonlyArray<unknown>,
  budget: number,
  sizeBytes: number,
  depth: number,
): unknown[] {
  const out: unknown[] = [];
  const entryLimit = containerEntryLimit(depth);
  let entries = 0;
  let truncated = false;
  for (const child of value) {
    if (entries >= entryLimit) {
      truncated = true;
      break;
    }
    const childBudget = childPreviewBudget(budget);
    const childSize = estimateValueBytes(child, childBudget);
    out.push(previewChildValue(child, childBudget, childSize, depth + 1));
    entries += 1;
  }
  if (truncated) out.push(truncatedMarker(value, sizeBytes));
  return out;
}

function previewChildValue(
  value: unknown,
  budget: number,
  sizeBytes: number,
  depth: number,
): unknown {
  if (sizeBytes <= budget) return value;
  if (budget > 0 && (Array.isArray(value) || isPlainObject(value))) {
    return previewLargeValue(value, budget, sizeBytes, depth);
  }
  return truncatedMarker(value, sizeBytes);
}

function containerEntryLimit(depth: number): number {
  return depth === 0 ? RUN_QUERY_CONTAINER_ENTRY_LIMIT : RUN_QUERY_NESTED_CONTAINER_ENTRY_LIMIT;
}

function childPreviewBudget(parentBudget: number): number {
  return Math.max(1, Math.min(parentBudget, RUN_QUERY_CONTAINER_CHILD_BUDGET_BYTES));
}

function truncatedMarker(value: unknown, sizeBytes: number) {
  return { __type__: 'truncated', sizeBytes, valueType: classifyValueType(value) };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function classifyValueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') {
    const t = (value as { __type__?: unknown; }).__type__;
    return typeof t === 'string' ? t : 'map';
  }
  return typeof value;
}

// Cheap O(value) walker that stops once `budget` is exceeded. Returns the accumulated size,
// which may exceed `budget` slightly when the threshold is crossed inside a leaf.
function estimateValueBytes(value: unknown, budget: number): number {
  let total = 0;
  const seen = new WeakSet<object>();
  function visit(v: unknown): void {
    if (total > budget) return;
    if (v === null || v === undefined) {
      total += 4;
      return;
    }
    if (typeof v === 'string') {
      total += v.length + 2;
      return;
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      total += 8;
      return;
    }
    if (typeof v === 'bigint') {
      total += 16;
      return;
    }
    if (v instanceof Date) {
      total += 24;
      return;
    }
    if (Array.isArray(v)) {
      if (seen.has(v)) return;
      seen.add(v);
      total += 2;
      for (const item of v) {
        visit(item);
        if (total > budget) return;
      }
      return;
    }
    if (typeof v === 'object') {
      if (seen.has(v)) return;
      seen.add(v);
      // FirestoreBytes-shaped objects: count base64 length as a proxy for binary size.
      const bytesField = (v as { base64?: unknown; }).base64;
      if (typeof bytesField === 'string') {
        total += bytesField.length;
        return;
      }
      total += 2;
      for (const k in v as Record<string, unknown>) {
        if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
        const child = (v as Record<string, unknown>)[k];
        total += k.length + 4;
        visit(child);
        if (total > budget) return;
      }
      return;
    }
    total += 8;
  }
  visit(value);
  return total;
}

function readFieldBudget(): number {
  const raw = process.env['FIREBASE_DESK_RUN_QUERY_FIELD_BUDGET_BYTES'];
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return 256 * 1024; // 256 KiB per field
}

export function toIpcSaveDocumentResult(
  result: FirestoreSaveDocumentResult,
): IpcResponse<'firestore.saveDocument'> {
  if (result.status === 'conflict') {
    return {
      status: 'conflict',
      remoteDocument: result.remoteDocument ? toIpcDocumentResult(result.remoteDocument) : null,
    };
  }
  return { status: 'saved', document: toIpcDocumentResult(result.document) };
}

export function toIpcUpdateDocumentFieldsResult(
  result: Awaited<ReturnType<FirestoreRepository['updateDocumentFields']>>,
): IpcResponse<'firestore.updateDocumentFields'> {
  if (result.status === 'conflict' || result.status === 'document-changed') {
    return {
      status: result.status,
      remoteDocument: result.remoteDocument ? toIpcDocumentResult(result.remoteDocument) : null,
    };
  }
  return {
    status: 'saved',
    document: toIpcDocumentResult(result.document),
    ...(result.documentChanged ? { documentChanged: true } : {}),
  };
}

export function toIpcScriptRunResult(result: ScriptRunResult): IpcResponse<'scriptRunner.run'> {
  return {
    returnValue: result.returnValue,
    ...(result.stream
      ? {
        stream: result.stream.map((item) => ({
          id: item.id,
          label: item.label,
          badge: item.badge,
          view: item.view,
          value: item.value,
        })),
      }
      : {}),
    logs: result.logs.map((log) => ({
      level: log.level,
      message: log.message,
      timestamp: log.timestamp,
    })),
    errors: result.errors.map((error) => ({
      ...(error.name ? { name: error.name } : {}),
      ...(error.code ? { code: error.code } : {}),
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    })),
    durationMs: result.durationMs,
    ...(result.cancelled !== undefined ? { cancelled: result.cancelled } : {}),
  };
}

export function toIpcScriptRunEvent(event: ScriptRunEvent): unknown {
  if (event.type === 'complete') {
    return { ...event, result: toIpcScriptRunResult(event.result) };
  }
  return event;
}
