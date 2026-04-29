import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog.tsx';
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
import { findDocumentByPath } from './resultModel.tsx';
import type { FirestoreQueryDraft, FirestoreResultView } from './types.ts';

export type {
  FirestoreQueryDraft,
  FirestoreQueryFilterDraft,
  FirestoreResultView,
} from './types.ts';

export interface FirestoreQuerySurfaceProps {
  readonly draft: FirestoreQueryDraft;
  readonly errorMessage?: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore?: boolean;
  readonly isLoading?: boolean;
  readonly onDeleteDocument?: (
    documentPath: string,
    options: DeleteDocumentOptions,
  ) => Promise<void> | void;
  readonly onDraftChange: (draft: FirestoreQueryDraft) => void;
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
  ) => Promise<void> | void;
  readonly onSelectDocument: (documentPath: string) => void;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument?: FirestoreDocumentResult | null;
  readonly selectedDocumentPath?: string | null;
  readonly settings?: SettingsRepository | undefined;
}

export function FirestoreQuerySurface(
  {
    draft,
    errorMessage = null,
    hasMore,
    isFetchingMore = false,
    isLoading = false,
    onDeleteDocument,
    onDraftChange,
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
  const [resultsStale, setResultsStale] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const fieldSuggestions = useFirestoreFieldCatalog({
    queryPath: draft.path,
    rows,
    settings,
  });

  async function saveDocument(documentPath: string, data: Record<string, unknown>) {
    validateFirestoreDocumentData(data);
    await onSaveDocument?.(documentPath, data);
    setResultsStale(true);
    setActionErrorMessage(null);
  }

  async function saveField(target: FieldEditTarget, value: unknown) {
    const document = documentForTarget(target, rows, selectedDocument);
    if (!document) throw new Error(`Document ${target.documentPath} is not loaded.`);
    validateFirestoreValue(value, target.fieldPath);
    await saveDocument(
      target.documentPath,
      setNestedFieldValue(document.data, target.fieldPath, value),
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
      await saveDocument(
        target.documentPath,
        deleteNestedFieldValue(document.data, target.fieldPath),
      );
      setDeleteFieldTarget(null);
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
        onSelectDocument={onSelectDocument}
        onSetFieldValue={onSaveDocument ? setFieldValue : undefined}
        onSetFieldNull={onSaveDocument ? setFieldNull : undefined}
      />
      <DocumentEditorModal
        document={editorDocument}
        open={Boolean(editorDocument)}
        onSaveDocument={saveDocument}
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
    </div>
  );
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
