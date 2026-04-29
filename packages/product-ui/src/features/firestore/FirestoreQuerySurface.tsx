import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import { useState } from 'react';
import { DocumentEditorModal } from './DocumentEditorModal.tsx';
import { useFirestoreFieldCatalog } from './fieldCatalog.ts';
import { FirestoreDocumentBrowser } from './FirestoreDocumentBrowser.tsx';
import { QueryBuilder } from './QueryBuilder.tsx';
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
  readonly onDeleteDocument?: (documentPath: string) => Promise<void> | void;
  readonly onDraftChange: (draft: FirestoreQueryDraft) => void;
  readonly onLoadMore: () => void;
  readonly onLoadSubcollections?: (
    documentPath: string,
  ) => Promise<ReadonlyArray<FirestoreCollectionNode>>;
  readonly onOpenDocumentInNewTab: (documentPath: string) => void;
  readonly onReset: () => void;
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
  const fieldSuggestions = useFirestoreFieldCatalog({
    queryPath: draft.path,
    rows,
    settings,
  });

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
        queryPath={draft.path}
        resultView={resultView}
        rows={rows}
        selectedDocument={selectedDocument}
        selectedDocumentPath={selectedDocumentPath}
        settings={settings}
        onDeleteDocument={onDeleteDocument}
        onEditDocument={setEditorDocument}
        onLoadMore={onLoadMore}
        onLoadSubcollections={onLoadSubcollections}
        onOpenDocumentInNewTab={onOpenDocumentInNewTab}
        onResultViewChange={setResultView}
        onSelectDocument={onSelectDocument}
      />
      <DocumentEditorModal
        document={editorDocument}
        open={Boolean(editorDocument)}
        onSaveDocument={onSaveDocument}
        onOpenChange={(open) => {
          if (!open) setEditorDocument(null);
        }}
      />
    </div>
  );
}
