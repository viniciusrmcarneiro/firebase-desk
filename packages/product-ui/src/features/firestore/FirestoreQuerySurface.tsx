import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  FirestoreFieldPatchOperation,
  FirestoreFieldStaleBehavior,
  FirestoreQueryDraft,
  FirestoreSaveDocumentOptions,
  FirestoreSaveDocumentResult,
  FirestoreUpdateDocumentFieldsOptions,
  FirestoreUpdateDocumentFieldsResult,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import { normalizeFirestoreWriteSettings } from '@firebase-desk/repo-contracts';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { ConflictMergeModal } from './ConflictMergeModal.tsx';
import { CreateDocumentModal } from './CreateDocumentModal.tsx';
import { DeleteDocumentDialog } from './DeleteDocumentDialog.tsx';
import type { DeleteDocumentOptions } from './deleteDocumentModel.ts';
import { DocumentEditorModal } from './DocumentEditorModal.tsx';
import { useFirestoreFieldCatalog } from './fieldCatalog.ts';
import { FieldEditModal } from './FieldEditModal.tsx';
import {
  deleteNestedFieldValue,
  type FieldEditTarget,
  fieldPathLabel,
  getNestedFieldValue,
  setNestedFieldValue,
  validateFirestoreDocumentData,
  validateFirestoreValue,
} from './fieldEditModel.ts';
import { FirestoreDocumentBrowser } from './FirestoreDocumentBrowser.tsx';
import { QueryBuilder } from './QueryBuilder.tsx';
import { findDocumentByPath, isCollectionPath } from './resultModel.tsx';
import type { FirestoreResultView } from './types.ts';

export interface FirestoreQuerySurfaceProps {
  readonly createDocumentRequest?: FirestoreCreateDocumentRequest | null | undefined;
  readonly draft: FirestoreQueryDraft;
  readonly errorMessage?: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore?: boolean;
  readonly isLoading?: boolean;
  readonly onCreateDocument?: (
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ) => Promise<void> | void;
  readonly onCreateDocumentRequestHandled?: ((requestId: number) => void) | undefined;
  readonly onDeleteDocument?: (
    documentPath: string,
    options: DeleteDocumentOptions,
  ) => Promise<void> | void;
  readonly onDraftChange: (draft: FirestoreQueryDraft) => void;
  readonly onGenerateDocumentId?: (
    collectionPath: string,
  ) => Promise<string> | string;
  readonly onLoadMore: () => void;
  readonly onLoadSubcollections?: (
    documentPath: string,
  ) => Promise<ReadonlyArray<FirestoreCollectionNode>>;
  readonly onOpenDocumentInNewTab: (documentPath: string) => void;
  readonly onReset: () => void;
  readonly onRefreshResults?: () => void;
  readonly onRun: () => void;
  readonly onSaveDocument?: (
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
  ) => Promise<FirestoreSaveDocumentResult | void> | FirestoreSaveDocumentResult | void;
  readonly onUpdateDocumentFields?: (
    documentPath: string,
    operations: ReadonlyArray<FirestoreFieldPatchOperation>,
    options: FirestoreUpdateDocumentFieldsOptions,
  ) =>
    | Promise<FirestoreUpdateDocumentFieldsResult | void>
    | FirestoreUpdateDocumentFieldsResult
    | void;
  readonly onSelectDocument: (documentPath: string) => void;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument?: FirestoreDocumentResult | null;
  readonly selectedDocumentPath?: string | null;
  readonly settings?: SettingsRepository | undefined;
}

export interface FirestoreCreateDocumentRequest {
  readonly collectionPath: string;
  readonly collectionPathEditable?: boolean;
  readonly requestId: number;
}

interface CreateDocumentState {
  readonly collectionPath: string;
  readonly collectionPathEditable: boolean;
}

interface ConflictMergeState {
  readonly documentPath: string;
  readonly localData: Record<string, unknown>;
  readonly onResolve?: (() => void) | undefined;
  readonly remoteDocument: FirestoreDocumentResult | null;
}

interface PendingStaleFieldPatch {
  readonly documentPath: string;
  readonly localData: Record<string, unknown>;
  readonly onResolve?: (() => void) | undefined;
  readonly operations: ReadonlyArray<FirestoreFieldPatchOperation>;
  readonly remoteDocument: FirestoreDocumentResult;
}

export function FirestoreQuerySurface(
  {
    draft,
    createDocumentRequest = null,
    errorMessage = null,
    hasMore,
    isFetchingMore = false,
    isLoading = false,
    onCreateDocument,
    onCreateDocumentRequestHandled,
    onDeleteDocument,
    onDraftChange,
    onGenerateDocumentId,
    onLoadMore,
    onLoadSubcollections,
    onOpenDocumentInNewTab,
    onReset,
    onRefreshResults,
    onRun,
    onSaveDocument,
    onUpdateDocumentFields,
    onSelectDocument,
    rows,
    selectedDocument = null,
    selectedDocumentPath = null,
    settings,
  }: FirestoreQuerySurfaceProps,
) {
  const [resultView, setResultView] = useState<FirestoreResultView>('table');
  const [editorDocument, setEditorDocument] = useState<FirestoreDocumentResult | null>(null);
  const [fieldEditor, setFieldEditor] = useState<FieldEditTarget | null>(null);
  const [deleteDocumentTarget, setDeleteDocumentTarget] = useState<FirestoreDocumentResult | null>(
    null,
  );
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<FieldEditTarget | null>(null);
  const [createDocumentState, setCreateDocumentState] = useState<CreateDocumentState | null>(null);
  const [handledCreateRequestId, setHandledCreateRequestId] = useState<number | null>(null);
  const [conflictMerge, setConflictMerge] = useState<ConflictMergeState | null>(null);
  const [pendingStaleFieldPatch, setPendingStaleFieldPatch] = useState<
    PendingStaleFieldPatch | null
  >(null);
  const [resultsStale, setResultsStale] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [actionNoticeMessage, setActionNoticeMessage] = useState<string | null>(null);
  const fieldSuggestions = useFirestoreFieldCatalog({
    queryPath: draft.path,
    rows,
    settings,
  });
  // Field-level actions require patch writes; falling back to full saves would overwrite documents.
  const fieldActionsEnabled = Boolean(onUpdateDocumentFields);

  useEffect(() => {
    if (!createDocumentRequest || createDocumentRequest.requestId === handledCreateRequestId) {
      return;
    }
    setHandledCreateRequestId(createDocumentRequest.requestId);
    setCreateDocumentState({
      collectionPath: createDocumentRequest.collectionPath,
      collectionPathEditable: createDocumentRequest.collectionPathEditable ?? false,
    });
    onCreateDocumentRequestHandled?.(createDocumentRequest.requestId);
  }, [createDocumentRequest, handledCreateRequestId, onCreateDocumentRequestHandled]);

  async function createDocument(
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ) {
    validateFirestoreDocumentData(data);
    await onCreateDocument?.(collectionPath, documentId, data);
    setResultsStale(true);
    setActionErrorMessage(null);
    setActionNoticeMessage(null);
  }

  async function saveDocument(
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
    conflictContext?: { readonly onResolve?: (() => void) | undefined; },
  ): Promise<boolean> {
    validateFirestoreDocumentData(data);
    const result = await onSaveDocument?.(documentPath, data, options);
    if (result?.status === 'conflict') {
      setConflictMerge({
        documentPath,
        localData: data,
        onResolve: conflictContext?.onResolve,
        remoteDocument: result.remoteDocument,
      });
      setActionErrorMessage(null);
      setActionNoticeMessage(null);
      return false;
    }
    setResultsStale(true);
    setActionErrorMessage(null);
    setActionNoticeMessage(null);
    conflictContext?.onResolve?.();
    return true;
  }

  async function updateDocumentFields(
    documentPath: string,
    operations: ReadonlyArray<FirestoreFieldPatchOperation>,
    options: FirestoreUpdateDocumentFieldsOptions,
    context: {
      readonly localData: Record<string, unknown>;
      readonly onResolve?: (() => void) | undefined;
    },
  ): Promise<boolean> {
    if (!onUpdateDocumentFields) throw new Error('Firestore field patch writes are unavailable.');
    validateFieldPatchOperations(operations);
    const result = await onUpdateDocumentFields?.(documentPath, operations, options);
    if (result?.status === 'conflict') {
      setConflictMerge({
        documentPath,
        localData: context.localData,
        onResolve: context.onResolve,
        remoteDocument: result.remoteDocument,
      });
      setActionErrorMessage(null);
      setActionNoticeMessage(null);
      return false;
    }
    if (result?.status === 'document-changed') {
      setActionNoticeMessage(null);
      if (options.staleBehavior === 'confirm' && result.remoteDocument) {
        setPendingStaleFieldPatch({
          documentPath,
          localData: context.localData,
          onResolve: context.onResolve,
          operations,
          remoteDocument: result.remoteDocument,
        });
        setActionErrorMessage(null);
      } else {
        setActionErrorMessage('Document changed elsewhere. Refresh before saving this field.');
      }
      return false;
    }
    setResultsStale(true);
    setActionErrorMessage(null);
    setActionNoticeMessage(
      result?.status === 'saved' && result.documentChanged
        ? 'Saved field. Document changed elsewhere; refresh to view the latest data.'
        : null,
    );
    context.onResolve?.();
    return true;
  }

  async function saveField(target: FieldEditTarget, value: unknown): Promise<boolean> {
    const document = documentForTarget(target, rows, selectedDocument);
    if (!document) throw new Error(`Document ${target.documentPath} is not loaded.`);
    validateFirestoreValue(value, target.fieldPath);
    const operation: FirestoreFieldPatchOperation = {
      baseValue: getNestedFieldValue(document.data, target.fieldPath),
      fieldPath: target.fieldPath,
      type: 'set',
      value,
    };
    const localData = setNestedFieldValue(document.data, target.fieldPath, value);
    return await updateDocumentFields(
      target.documentPath,
      [operation],
      await fieldOptionsFor(document),
      {
        localData,
        onResolve: () => setFieldEditor(null),
      },
    );
  }

  async function setFieldNull(target: FieldEditTarget) {
    try {
      await saveField(target, null);
    } catch (caught) {
      setActionErrorMessage(messageFromError(caught, 'Could not set field to null.'));
    }
  }

  async function setFieldValue(target: FieldEditTarget, value: unknown) {
    try {
      await saveField(target, value);
    } catch (caught) {
      setActionErrorMessage(messageFromError(caught, 'Could not save field.'));
    }
  }

  async function deleteField(target: FieldEditTarget) {
    try {
      const document = documentForTarget(target, rows, selectedDocument);
      if (!document) throw new Error(`Document ${target.documentPath} is not loaded.`);
      const operation: FirestoreFieldPatchOperation = {
        baseValue: getNestedFieldValue(document.data, target.fieldPath),
        fieldPath: target.fieldPath,
        type: 'delete',
      };
      const saved = await updateDocumentFields(
        target.documentPath,
        [operation],
        await fieldOptionsFor(document),
        {
          localData: deleteNestedFieldValue(document.data, target.fieldPath),
          onResolve: () => setDeleteFieldTarget(null),
        },
      );
      if (saved) setDeleteFieldTarget(null);
    } catch (caught) {
      setActionErrorMessage(messageFromError(caught, 'Could not delete field.'));
    }
  }

  async function deleteDocument(documentPath: string, options: DeleteDocumentOptions) {
    try {
      await onDeleteDocument?.(documentPath, options);
      setResultsStale(true);
      setActionErrorMessage(null);
    } catch (caught) {
      setActionErrorMessage(messageFromError(caught, 'Could not delete document.'));
    }
  }

  async function fieldOptionsFor(
    document: FirestoreDocumentResult,
  ): Promise<FirestoreUpdateDocumentFieldsOptions> {
    return {
      ...(document.updateTime ? { lastUpdateTime: document.updateTime } : {}),
      staleBehavior: await loadFieldStaleBehavior(settings),
    };
  }

  function refreshResults() {
    setResultsStale(false);
    setActionErrorMessage(null);
    setActionNoticeMessage(null);
    (onRefreshResults ?? onRun)();
  }

  function openCreateDocument(collectionPath: string) {
    if (!isCollectionPath(collectionPath)) return;
    setCreateDocumentState({ collectionPath, collectionPathEditable: false });
  }

  async function saveMergedConflict(data: Record<string, unknown>) {
    if (!conflictMerge?.remoteDocument?.updateTime) {
      throw new Error('Remote update time is unavailable. Refresh the document before saving.');
    }
    const saved = await saveDocument(
      conflictMerge.documentPath,
      data,
      { lastUpdateTime: conflictMerge.remoteDocument.updateTime },
      { onResolve: conflictMerge.onResolve },
    );
    if (saved) setConflictMerge(null);
  }

  function refreshAfterConflict() {
    setConflictMerge(null);
    setEditorDocument(null);
    setFieldEditor(null);
    setDeleteFieldTarget(null);
    setPendingStaleFieldPatch(null);
    refreshResults();
  }

  async function confirmStaleFieldPatch() {
    const lastUpdateTime = pendingStaleFieldPatch?.remoteDocument.updateTime;
    if (!lastUpdateTime) return;
    const pending = pendingStaleFieldPatch;
    setPendingStaleFieldPatch(null);
    try {
      await updateDocumentFields(
        pending.documentPath,
        pending.operations,
        {
          lastUpdateTime,
          staleBehavior: 'confirm',
        },
        {
          localData: pending.localData,
          onResolve: pending.onResolve,
        },
      );
    } catch (caught) {
      setActionErrorMessage(messageFromError(caught, 'Could not save field.'));
    }
  }

  return (
    <div className='h-full min-h-0 p-2'>
      <FirestoreDocumentBrowser
        errorMessage={errorMessage}
        hasMore={hasMore}
        header={
          <QueryBuilder
            draft={draft}
            fieldSuggestions={fieldSuggestions}
            isLoading={isLoading}
            onDraftChange={onDraftChange}
            onReset={onReset}
            onRun={onRun}
          />
        }
        isFetchingMore={isFetchingMore}
        isLoading={isLoading}
        actionErrorMessage={actionErrorMessage}
        actionNoticeMessage={actionNoticeMessage}
        queryPath={draft.path}
        resultView={resultView}
        resultsStale={resultsStale}
        rows={rows}
        selectedDocument={selectedDocument}
        selectedDocumentPath={selectedDocumentPath}
        settings={settings}
        onDeleteDocument={onDeleteDocument ? setDeleteDocumentTarget : undefined}
        onDeleteField={fieldActionsEnabled ? setDeleteFieldTarget : undefined}
        onEditDocument={setEditorDocument}
        onEditField={fieldActionsEnabled
          ? (target) => {
            const document = documentForTarget(target, rows, selectedDocument);
            setFieldEditor({
              ...target,
              value: document
                ? getNestedFieldValue(document.data, target.fieldPath)
                : target.value,
            });
          }
          : undefined}
        onLoadMore={onLoadMore}
        onLoadSubcollections={onLoadSubcollections}
        onOpenDocumentInNewTab={onOpenDocumentInNewTab}
        onResultViewChange={setResultView}
        onRefreshResults={refreshResults}
        onCreateDocument={onCreateDocument && onGenerateDocumentId
          ? openCreateDocument
          : undefined}
        onSelectDocument={onSelectDocument}
        onSetFieldValue={fieldActionsEnabled ? setFieldValue : undefined}
        onSetFieldNull={fieldActionsEnabled ? setFieldNull : undefined}
      />
      <DocumentEditorModal
        document={editorDocument}
        open={Boolean(editorDocument)}
        onSaveDocument={(documentPath, data) =>
          saveDocument(documentPath, data, saveOptionsFor(editorDocument), {
            onResolve: () => setEditorDocument(null),
          })}
        onOpenChange={(open) => {
          if (!open) setEditorDocument(null);
        }}
      />
      <FieldEditModal
        open={Boolean(fieldEditor)}
        target={fieldEditor}
        onSaveField={saveField}
        onOpenChange={(open) => {
          if (!open) setFieldEditor(null);
        }}
      />
      <DeleteDocumentDialog
        document={deleteDocumentTarget}
        open={Boolean(deleteDocumentTarget)}
        onConfirm={deleteDocument}
        onOpenChange={(open) => {
          if (!open) setDeleteDocumentTarget(null);
        }}
      />
      <ConfirmDialog
        confirmLabel='Delete'
        description={deleteFieldTarget
          ? `Delete field ${fieldPathLabel(deleteFieldTarget.fieldPath)}?`
          : 'Delete field?'}
        open={Boolean(deleteFieldTarget)}
        title='Delete field'
        onConfirm={() => {
          if (deleteFieldTarget) void deleteField(deleteFieldTarget);
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteFieldTarget(null);
        }}
      />
      <ConfirmDialog
        confirmLabel='Save field'
        description='The document changed elsewhere, but this field still matches your loaded value. Save this field change anyway?'
        open={Boolean(pendingStaleFieldPatch)}
        title='Document changed elsewhere'
        onConfirm={() => {
          void confirmStaleFieldPatch();
        }}
        onOpenChange={(open) => {
          if (!open) setPendingStaleFieldPatch(null);
        }}
      />
      <CreateDocumentModal
        collectionPath={createDocumentState?.collectionPath ?? null}
        collectionPathEditable={createDocumentState?.collectionPathEditable}
        hint={createDocumentState?.collectionPathEditable
          ? 'Firestore creates a collection when the first document is written. Enter the collection path and first document data.'
          : null}
        open={Boolean(createDocumentState)}
        title={createDocumentState?.collectionPathEditable ? 'New collection' : 'New document'}
        onCreateDocument={createDocument}
        onGenerateDocumentId={async (collectionPath) =>
          await Promise.resolve(onGenerateDocumentId?.(collectionPath) ?? '')}
        onOpenChange={(open) => {
          if (!open) setCreateDocumentState(null);
        }}
      />
      {conflictMerge
        ? (
          <ConflictMergeModal
            documentPath={conflictMerge.documentPath}
            localData={conflictMerge.localData}
            open
            remoteDocument={conflictMerge.remoteDocument}
            onCancel={() => setConflictMerge(null)}
            onRefresh={refreshAfterConflict}
            onSaveMerged={saveMergedConflict}
          />
        )
        : null}
    </div>
  );
}

function saveOptionsFor(
  document: FirestoreDocumentResult | null,
): FirestoreSaveDocumentOptions | undefined {
  return document?.updateTime ? { lastUpdateTime: document.updateTime } : undefined;
}

async function loadFieldStaleBehavior(
  settings: SettingsRepository | undefined,
): Promise<FirestoreFieldStaleBehavior> {
  return normalizeFirestoreWriteSettings((await settings?.load())?.firestoreWrites)
    .fieldStaleBehavior;
}

function validateFieldPatchOperations(
  operations: ReadonlyArray<FirestoreFieldPatchOperation>,
): void {
  if (!operations.length) throw new Error('At least one field operation is required.');
  for (const operation of operations) {
    if (!operation.fieldPath.length) throw new Error('Field path is required.');
    if (operation.type === 'set') validateFirestoreValue(operation.value, operation.fieldPath);
  }
}

function documentForTarget(
  target: FieldEditTarget,
  rows: ReadonlyArray<FirestoreDocumentResult>,
  selectedDocument: FirestoreDocumentResult | null,
): FirestoreDocumentResult | null {
  return findDocumentByPath(rows, target.documentPath)
    ?? (selectedDocument?.path === target.documentPath ? selectedDocument : null);
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
