import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  FirestoreSaveDocumentOptions,
  FirestoreSaveDocumentResult,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
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
import type { FirestoreQueryDraft, FirestoreResultView } from './types.ts';

export type {
  FirestoreQueryDraft,
  FirestoreQueryFilterDraft,
  FirestoreResultView,
} from './types.ts';

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
  readonly onSelectDocument: (documentPath: string) => void;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument?: FirestoreDocumentResult | null;
  readonly selectedDocumentPath?: string | null;
  readonly settings?: SettingsRepository | undefined;
}

export interface FirestoreCreateDocumentRequest {
  readonly collectionPath: string;
  readonly requestId: number;
}

interface SaveConflictContext {
  readonly baseDocument: FirestoreDocumentResult | null;
  readonly onResolve?: (() => void) | undefined;
}

interface ConflictMergeState {
  readonly baseDocument: FirestoreDocumentResult | null;
  readonly documentPath: string;
  readonly localData: Record<string, unknown>;
  readonly onResolve?: (() => void) | undefined;
  readonly remoteDocument: FirestoreDocumentResult | null;
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
  const [createDocumentCollectionPath, setCreateDocumentCollectionPath] = useState<string | null>(
    null,
  );
  const [handledCreateRequestId, setHandledCreateRequestId] = useState<number | null>(null);
  const [conflictMerge, setConflictMerge] = useState<ConflictMergeState | null>(null);
  const [resultsStale, setResultsStale] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const fieldSuggestions = useFirestoreFieldCatalog({
    queryPath: draft.path,
    rows,
    settings,
  });

  useEffect(() => {
    if (!createDocumentRequest || createDocumentRequest.requestId === handledCreateRequestId) {
      return;
    }
    setHandledCreateRequestId(createDocumentRequest.requestId);
    setCreateDocumentCollectionPath(createDocumentRequest.collectionPath);
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
  }

  async function saveDocument(
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
    conflictContext?: SaveConflictContext,
  ): Promise<boolean> {
    validateFirestoreDocumentData(data);
    const result = await onSaveDocument?.(documentPath, data, options);
    if (result?.status === 'conflict') {
      setConflictMerge({
        baseDocument: conflictContext?.baseDocument ?? null,
        documentPath,
        localData: data,
        onResolve: conflictContext?.onResolve,
        remoteDocument: result.remoteDocument,
      });
      setActionErrorMessage(null);
      return false;
    }
    setResultsStale(true);
    setActionErrorMessage(null);
    conflictContext?.onResolve?.();
    return true;
  }

  async function saveField(target: FieldEditTarget, value: unknown): Promise<boolean> {
    const document = documentForTarget(target, rows, selectedDocument);
    if (!document) throw new Error(`Document ${target.documentPath} is not loaded.`);
    validateFirestoreValue(value, target.fieldPath);
    const data = setNestedFieldValue(document.data, target.fieldPath, value);
    return await saveDocument(target.documentPath, data, saveOptionsFor(document), {
      baseDocument: document,
      onResolve: () => setFieldEditor(null),
    });
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
      const saved = await saveDocument(
        target.documentPath,
        deleteNestedFieldValue(document.data, target.fieldPath),
        saveOptionsFor(document),
        { baseDocument: document },
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

  function refreshResults() {
    setResultsStale(false);
    setActionErrorMessage(null);
    (onRefreshResults ?? onRun)();
  }

  function openCreateDocument(collectionPath: string) {
    if (!isCollectionPath(collectionPath)) return;
    setCreateDocumentCollectionPath(collectionPath);
  }

  async function saveMergedConflict(data: Record<string, unknown>) {
    if (!conflictMerge?.remoteDocument?.updateTime) {
      throw new Error('Remote update time is unavailable. Refresh the document before saving.');
    }
    const saved = await saveDocument(
      conflictMerge.documentPath,
      data,
      { lastUpdateTime: conflictMerge.remoteDocument.updateTime },
      {
        baseDocument: conflictMerge.remoteDocument,
        onResolve: conflictMerge.onResolve,
      },
    );
    if (saved) setConflictMerge(null);
  }

  function refreshAfterConflict() {
    setConflictMerge(null);
    setEditorDocument(null);
    setFieldEditor(null);
    setDeleteFieldTarget(null);
    refreshResults();
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
            onCreateDocument={onCreateDocument && onGenerateDocumentId
              ? openCreateDocument
              : undefined}
            onDraftChange={onDraftChange}
            onReset={onReset}
            onRun={onRun}
          />
        }
        isFetchingMore={isFetchingMore}
        isLoading={isLoading}
        actionErrorMessage={actionErrorMessage}
        queryPath={draft.path}
        resultView={resultView}
        resultsStale={resultsStale}
        rows={rows}
        selectedDocument={selectedDocument}
        selectedDocumentPath={selectedDocumentPath}
        settings={settings}
        onDeleteDocument={onDeleteDocument ? setDeleteDocumentTarget : undefined}
        onDeleteField={onSaveDocument ? setDeleteFieldTarget : undefined}
        onEditDocument={setEditorDocument}
        onEditField={onSaveDocument
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
        onSetFieldValue={onSaveDocument ? setFieldValue : undefined}
        onSetFieldNull={onSaveDocument ? setFieldNull : undefined}
      />
      <DocumentEditorModal
        document={editorDocument}
        open={Boolean(editorDocument)}
        onSaveDocument={(documentPath, data) =>
          saveDocument(documentPath, data, saveOptionsFor(editorDocument), {
            baseDocument: editorDocument,
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
      <CreateDocumentModal
        collectionPath={createDocumentCollectionPath}
        open={Boolean(createDocumentCollectionPath)}
        onCreateDocument={createDocument}
        onGenerateDocumentId={async (collectionPath) =>
          await Promise.resolve(onGenerateDocumentId?.(collectionPath) ?? '')}
        onOpenChange={(open) => {
          if (!open) setCreateDocumentCollectionPath(null);
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
