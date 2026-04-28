import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  ScriptLogEntry,
  ScriptRunResult,
  ScriptStreamItem,
} from '@firebase-desk/repo-contracts';
import {
  Badge,
  Button,
  cn,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@firebase-desk/ui';
import { Bug, FileText, Play, Table2, TerminalSquare } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CodeEditor } from '../../code-editor/CodeEditor.tsx';
import { FirestoreDocumentBrowser } from '../firestore/FirestoreDocumentBrowser.tsx';
import { formatFirestoreValue } from '../firestore/FirestoreValueCell.tsx';
import type { FirestoreResultView } from '../firestore/types.ts';

export const JS_QUERY_SAMPLE_SOURCE = `const db = admin.firestore();
const snapshot = await db.collection('orders')
  .where('status', '==', 'paid')
  .limit(10)
  .get();

console.log('Fetched', snapshot.size, 'orders');
yield snapshot.docs[0];
yield db.collection('customers');
yield snapshot;
return snapshot;`;

export interface JsQuerySurfaceProps {
  readonly isRunning?: boolean;
  readonly onRun: () => void;
  readonly onSourceChange: (source: string) => void;
  readonly result?: ScriptRunResult | null;
  readonly source: string;
}

export function JsQuerySurface(
  { isRunning = false, onRun, onSourceChange, result, source }: JsQuerySurfaceProps,
) {
  const isWide = useMediaQuery('(min-width: 900px)');
  const direction = isWide ? 'horizontal' : 'vertical';

  return (
    <div className='h-full min-h-0 overflow-hidden p-2'>
      <ResizablePanelGroup
        key={direction}
        className='h-full min-h-0'
        direction={direction}
      >
        <ResizablePanel
          className='h-full'
          defaultSize={isWide ? '50%' : '52%'}
          minSize={isWide ? '360px' : '220px'}
        >
          <Panel className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
            <PanelHeader
              actions={
                <Button disabled={isRunning} variant='primary' onClick={onRun}>
                  <Play size={14} aria-hidden='true' /> Run
                </Button>
              }
            >
              JavaScript Query
            </PanelHeader>
            <PanelBody className='min-h-0 p-0'>
              <CodeEditor language='javascript' value={source} onChange={onSourceChange} />
            </PanelBody>
          </Panel>
        </ResizablePanel>
        <ResizableHandle className={isWide ? 'mx-2 h-full w-px' : 'my-2 h-px w-full'} />
        <ResizablePanel
          className='h-full'
          defaultSize={isWide ? '50%' : '48%'}
          minSize={isWide ? '320px' : '180px'}
        >
          <ScriptOutput result={result ?? null} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

type ScriptOutputView = 'results' | 'logs' | 'errors';

function ScriptOutput({ result }: { readonly result: ScriptRunResult | null; }) {
  const logItems = useMemo(() => result?.logs ?? [], [result]);
  const errorItems = useMemo(() => result?.errors ?? [], [result]);
  const streamItems = useMemo(() => streamItemsFor(result), [result]);
  const [view, setView] = useState<ScriptOutputView>('logs');

  useEffect(() => {
    if (!result) return;
    setView(result.errors.length ? 'errors' : 'results');
  }, [result]);

  return (
    <Tabs
      className='h-full min-h-0'
      value={view}
      onValueChange={(nextView) => setView(nextView as ScriptOutputView)}
    >
      <Panel className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
        <PanelHeader
          actions={
            <div className='flex items-center gap-2'>
              {result ? <Badge>{result.durationMs}ms</Badge> : null}
              <TabsList className='border-b-0'>
                <TabsTrigger className='gap-1.5' value='results'>
                  <Table2 size={14} aria-hidden='true' /> Results
                </TabsTrigger>
                <TabsTrigger className='gap-1.5' value='logs'>
                  <FileText size={14} aria-hidden='true' /> Logs
                </TabsTrigger>
                <TabsTrigger className='gap-1.5' value='errors'>
                  <Bug size={14} aria-hidden='true' /> Errors
                </TabsTrigger>
              </TabsList>
            </div>
          }
        >
          Output
        </PanelHeader>
        <PanelBody className='min-h-0 overflow-hidden p-0'>
          <TabsContent className='h-full min-h-0 overflow-auto' value='results'>
            <ScriptStream items={streamItems} />
          </TabsContent>
          <TabsContent className='h-full min-h-0 overflow-auto' value='logs'>
            <LogList logs={logItems} />
          </TabsContent>
          <TabsContent className='h-full min-h-0 overflow-auto' value='errors'>
            <ErrorList errors={errorItems} />
          </TabsContent>
        </PanelBody>
      </Panel>
    </Tabs>
  );
}

function LogList({ logs }: { readonly logs: ReadonlyArray<ScriptLogEntry>; }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<TerminalSquare size={20} aria-hidden='true' />}
        title='No logs'
        description='Script console output will appear here.'
      />
    );
  }
  return <JsonPreview className='m-3' value={logs.map(formatLogEntry)} />;
}

function ScriptStream({ items }: { readonly items: ReadonlyArray<ScriptStreamItem>; }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<TerminalSquare size={20} aria-hidden='true' />}
        title='No data to show'
        description='The script returned undefined, null, or an unsupported value.'
      />
    );
  }

  return (
    <div className='grid content-start gap-2 p-3'>
      {items.map((item) => <ScriptStreamCard key={item.id} item={item} />)}
    </div>
  );
}

function ScriptStreamCard({ item }: { readonly item: ScriptStreamItem; }) {
  return (
    <details className='overflow-hidden rounded-md border border-border-subtle bg-bg-panel shadow-sm'>
      <summary className='flex cursor-pointer list-inside flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-bg-subtle px-3 py-2 text-sm font-semibold text-text-primary'>
        <span>{item.label}</span>
        <Badge>{item.badge}</Badge>
      </summary>
      {item.view === 'table'
        ? <ScriptFirestorePreview value={item.value} />
        : <JsonPreview className='m-3' value={item.value} />}
    </details>
  );
}

function ScriptFirestorePreview({ value }: { readonly value: unknown; }) {
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

  const selectedDocument = rows.find((row) => row.path === selectedDocumentPath) ?? rows[0] ?? null;
  return (
    <div className='h-[420px] border-t border-border-subtle'>
      <FirestoreDocumentBrowser
        hasMore={false}
        queryPath={queryPathForRows(rows)}
        resultView={resultView}
        rows={rows}
        selectedDocument={selectedDocument}
        selectedDocumentPath={selectedDocumentPath}
        onLoadMore={() => {}}
        onResultViewChange={setResultView}
        onSelectDocument={setSelectedDocumentPath}
      />
    </div>
  );
}

function ErrorList(
  { errors }: { readonly errors: ScriptRunResult['errors']; },
) {
  if (!errors.length) {
    return (
      <EmptyState
        icon={<Bug size={20} aria-hidden='true' />}
        title='No errors'
        description='Thrown script errors will appear here.'
      />
    );
  }

  const firstError = errors.at(0);
  const errorValue = errors.length === 1 && firstError
    ? toFirebaseError(firstError)
    : errors.map(toFirebaseError);
  return <JsonPreview className='m-3' value={errorValue} />;
}

function JsonPreview(
  { className, value }: { readonly className?: string; readonly value: unknown; },
) {
  return (
    <pre
      className={cn(
        'overflow-auto rounded-md border border-border-subtle bg-bg-subtle p-3 font-mono text-xs leading-relaxed text-text-secondary',
        className,
      )}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function firestoreDocumentsFromValue(value: unknown): ReadonlyArray<FirestoreDocumentResult> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;
    const data = record.data;
    if (typeof record.id !== 'string' || !data || typeof data !== 'object' || Array.isArray(data)) {
      return [];
    }
    const id = record.id;
    const path = stringOrUndefined(record.path) ?? id;
    const subcollections = subcollectionsFromValue(record.subcollections);
    return [{
      id,
      path,
      data: data as Record<string, unknown>,
      hasSubcollections: typeof record.hasSubcollections === 'boolean'
        ? record.hasSubcollections
        : (subcollections?.length ?? 0) > 0,
      ...(subcollections ? { subcollections } : {}),
    }];
  });
}

function subcollectionsFromValue(
  value: unknown,
): ReadonlyArray<FirestoreCollectionNode> | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;
    const id = stringOrUndefined(record.id);
    const path = stringOrUndefined(record.path);
    if (!id || !path) return [];
    return [{ id, path }];
  });
}

function queryPathForRows(rows: ReadonlyArray<FirestoreDocumentResult>): string {
  const path = rows[0]?.path;
  if (!path) return 'results';
  const parts = path.split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : 'results';
}

function streamItemsFor(result: ScriptRunResult | null): ReadonlyArray<ScriptStreamItem> {
  if (!result || result.errors.length) return [];
  if (result.stream?.length) return result.stream;
  if (!isRenderableValue(result.returnValue)) return [];
  return [{
    id: 'return-value',
    label: 'return value',
    badge: valueSummary(result.returnValue),
    view: 'json',
    value: result.returnValue,
  }];
}

function isRenderableValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  const valueType = typeof value;
  return valueType !== 'function' && valueType !== 'symbol';
}

function formatLogEntry(log: ScriptLogEntry) {
  return `[${formatTime(log.timestamp)}] ${log.message}`;
}

function formatTime(timestamp: string): string {
  const isoTime = /T(?<time>\d{2}:\d{2}:\d{2})/.exec(timestamp)?.groups?.time;
  if (isoTime) return isoTime;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toISOString().slice(11, 19);
}

function toFirebaseError(error: ScriptRunResult['errors'][number]) {
  const record = error as ScriptRunResult['errors'][number] & {
    readonly code?: string;
    readonly name?: string;
  };
  return {
    name: record.name ?? 'Error',
    ...(record.code ? { code: record.code } : {}),
    message: error.message,
    ...(error.stack ? { stack: error.stack } : {}),
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function valueSummary(value: unknown): string {
  if (value === undefined) return '';
  if (value === null || Array.isArray(value)) return formatFirestoreValue(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['__type__'] === 'string') return formatFirestoreValue(value);
    if (typeof record.iso === 'string') return record.iso;
    if (typeof record.path === 'string') return record.path;
    return `Object(${Object.keys(record).length})`;
  }
  return String(value);
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
