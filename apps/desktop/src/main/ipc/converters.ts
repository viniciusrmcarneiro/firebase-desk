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

export function toIpcResultPage(
  page: Page<FirestoreDocumentResult>,
): IpcResponse<'firestore.runQuery'> {
  return {
    items: page.items.map(toIpcDocumentResult),
    nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
  };
}

export function toIpcDocumentResult(
  document: FirestoreDocumentResult,
): NonNullable<IpcResponse<'firestore.getDocument'>> {
  return {
    id: document.id,
    path: document.path,
    data: document.data,
    hasSubcollections: document.hasSubcollections,
    ...(document.subcollections
      ? { subcollections: document.subcollections.map(toIpcCollectionNode) }
      : {}),
    ...(document.updateTime ? { updateTime: document.updateTime } : {}),
  };
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
