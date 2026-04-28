import type { FirestoreDocumentResult, SettingsRepository } from '@firebase-desk/repo-contracts';
import { useEffect, useMemo, useState } from 'react';
import { FirestoreDocumentBrowser } from '../firestore/FirestoreDocumentBrowser.tsx';
import type { FirestoreResultView } from '../firestore/types.ts';
import { JsonPreview } from './JsonPreview.tsx';
import { firestoreDocumentsFromValue, queryPathForRows } from './scriptResultModel.ts';

export function ScriptFirestorePreview(
  {
    settings,
    value,
  }: {
    readonly settings?: SettingsRepository | undefined;
    readonly value: unknown;
  },
) {
  const rows = useMemo(() => firestoreDocumentsFromValue(value), [value]);
  const [resultView, setResultView] = useState<FirestoreResultView>('table');
  const [selectedDocumentPath, setSelectedDocumentPath] = useState<string | null>(
    () => rows[0]?.path ?? null,
  );

  useEffect(() => {
    setSelectedDocumentPath((current) =>
      current && rows.some((row) => row.path === current) ? current : rows[0]?.path ?? null
    );
  }, [rows]);

  if (!rows.length) return <JsonPreview className='m-3' value={value} />;

  const selectedDocument = selectedDocumentForRows(rows, selectedDocumentPath);
  return (
    <div className='h-[420px] border-t border-border-subtle'>
      <FirestoreDocumentBrowser
        hasMore={false}
        queryPath={queryPathForRows(rows)}
        resultView={resultView}
        rows={rows}
        selectedDocument={selectedDocument}
        selectedDocumentPath={selectedDocumentPath}
        settings={settings}
        onLoadMore={() => {}}
        onResultViewChange={setResultView}
        onSelectDocument={setSelectedDocumentPath}
      />
    </div>
  );
}

function selectedDocumentForRows(
  rows: ReadonlyArray<FirestoreDocumentResult>,
  selectedDocumentPath: string | null,
): FirestoreDocumentResult | null {
  return rows.find((row) => row.path === selectedDocumentPath) ?? rows[0] ?? null;
}
