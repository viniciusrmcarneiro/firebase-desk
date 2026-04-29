import type {
  ScriptLogEntry,
  ScriptRunResult,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import {
  Badge,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@firebase-desk/ui';
import { Bug, FileText, Table2, TerminalSquare } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDuration } from './duration.ts';
import { JsonPreview } from './JsonPreview.tsx';
import { formatLogEntry, streamItemsFor, toFirebaseError } from './scriptResultModel.ts';
import { ScriptStream } from './ScriptStream.tsx';
import { useElapsedMs } from './useElapsedMs.ts';

type ScriptOutputView = 'results' | 'logs' | 'errors';

export function ScriptOutput(
  {
    isRunning,
    result,
    runId = null,
    settings,
    startedAt = null,
  }: {
    readonly isRunning: boolean;
    readonly result: ScriptRunResult | null;
    readonly runId?: string | null;
    readonly settings?: SettingsRepository | undefined;
    readonly startedAt?: number | null;
  },
) {
  const logItems = useMemo(() => result?.logs ?? [], [result]);
  const errorItems = useMemo(() => result?.errors ?? [], [result]);
  const streamItems = useMemo(() => streamItemsFor(result), [result]);
  const [view, setView] = useState<ScriptOutputView>(() => preferredOutputView(result));
  const manualViewRef = useRef(false);
  const selectManualView = (nextView: ScriptOutputView) => {
    manualViewRef.current = true;
    setView(nextView);
  };

  useEffect(() => {
    manualViewRef.current = false;
    setView('logs');
  }, [runId]);

  useEffect(() => {
    if (!result || manualViewRef.current) return;
    if (errorItems.length) setView('errors');
    else if (streamItems.length) setView('results');
    else if (logItems.length) setView('logs');
  }, [errorItems.length, logItems.length, result, streamItems.length]);

  return (
    <Tabs
      className='h-full min-h-0'
      value={view}
      onValueChange={(nextView) => {
        selectManualView(nextView as ScriptOutputView);
      }}
    >
      <Panel className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
        <PanelHeader
          actions={
            <ScriptOutputActions
              isRunning={isRunning}
              result={result}
              startedAt={startedAt}
              onSelectView={selectManualView}
            />
          }
        >
          Output
        </PanelHeader>
        <PanelBody className='grid min-h-0 overflow-hidden p-0'>
          <TabsContent
            className='col-start-1 row-start-1 m-0 h-full min-h-0 overflow-auto data-[state=inactive]:hidden'
            value='results'
          >
            <ScriptStream items={streamItems} settings={settings} />
          </TabsContent>
          <TabsContent
            className='col-start-1 row-start-1 m-0 h-full min-h-0 overflow-auto data-[state=inactive]:hidden'
            value='logs'
          >
            <LogList active={view === 'logs'} logs={logItems} />
          </TabsContent>
          <TabsContent
            className='col-start-1 row-start-1 m-0 h-full min-h-0 overflow-auto data-[state=inactive]:hidden'
            value='errors'
          >
            <ErrorList active={view === 'errors'} errors={errorItems} />
          </TabsContent>
        </PanelBody>
      </Panel>
    </Tabs>
  );
}

function preferredOutputView(result: ScriptRunResult | null): ScriptOutputView {
  if (!result) return 'logs';
  if (result.errors.length) return 'errors';
  if (streamItemsFor(result).length) return 'results';
  return 'logs';
}

function ScriptOutputActions(
  {
    isRunning,
    onSelectView,
    result,
    startedAt,
  }: {
    readonly isRunning: boolean;
    readonly onSelectView: (view: ScriptOutputView) => void;
    readonly result: ScriptRunResult | null;
    readonly startedAt: number | null;
  },
) {
  const elapsedMs = useElapsedMs(isRunning, startedAt);
  return (
    <div className='flex items-center gap-2'>
      {result?.cancelled ? <Badge variant='warning'>cancelled</Badge> : null}
      {isRunning
        ? <Badge variant='warning'>{formatDuration(elapsedMs)} elapsed</Badge>
        : result
        ? (
          <Badge title={`${result.durationMs}ms`}>
            {formatDuration(result.durationMs)}
          </Badge>
        )
        : null}
      <TabsList className='border-b-0'>
        <TabsTrigger className='gap-1.5' value='results' onClick={() => onSelectView('results')}>
          <Table2 size={14} aria-hidden='true' /> Results
        </TabsTrigger>
        <TabsTrigger className='gap-1.5' value='logs' onClick={() => onSelectView('logs')}>
          <FileText size={14} aria-hidden='true' /> Logs
        </TabsTrigger>
        <TabsTrigger className='gap-1.5' value='errors' onClick={() => onSelectView('errors')}>
          <Bug size={14} aria-hidden='true' /> Errors
        </TabsTrigger>
      </TabsList>
    </div>
  );
}

function LogList(
  { active, logs }: { readonly active: boolean; readonly logs: ReadonlyArray<ScriptLogEntry>; },
) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<TerminalSquare size={20} aria-hidden='true' />}
        title='No logs'
        description='Script console output will appear here.'
      />
    );
  }
  return (
    <div className='h-full min-h-0 p-3'>
      <JsonPreview active={active} value={logs.map(formatLogEntry)} />
    </div>
  );
}

function ErrorList(
  { active, errors }: { readonly active: boolean; readonly errors: ScriptRunResult['errors']; },
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
  return (
    <div className='h-full min-h-0 p-3'>
      <JsonPreview active={active} value={errorValue} />
    </div>
  );
}
