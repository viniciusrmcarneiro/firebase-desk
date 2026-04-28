import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@firebase-desk/ui';
import { useMediaQuery } from '../../hooks/useMediaQuery.ts';
import { JsQueryEditorPanel } from './JsQueryEditorPanel.tsx';
import { ScriptOutput } from './ScriptOutput.tsx';

export { JS_QUERY_SAMPLE_SOURCE } from './sampleSource.ts';

export interface JsQuerySurfaceProps {
  readonly isRunning?: boolean;
  readonly runStartedAt?: number | null;
  readonly onCancel: () => void;
  readonly onRun: () => void;
  readonly onSourceChange: (source: string) => void;
  readonly result?: ScriptRunResult | null;
  readonly runId?: string | null;
  readonly source: string;
}

export function JsQuerySurface(
  {
    isRunning = false,
    onCancel,
    onRun,
    onSourceChange,
    result,
    runId = null,
    runStartedAt = null,
    source,
  }: JsQuerySurfaceProps,
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
          <JsQueryEditorPanel
            isRunning={isRunning}
            source={source}
            onCancel={onCancel}
            onRun={onRun}
            onSourceChange={onSourceChange}
          />
        </ResizablePanel>
        <ResizableHandle className={isWide ? 'mx-2 h-full w-px' : 'my-2 h-px w-full'} />
        <ResizablePanel
          className='h-full'
          defaultSize={isWide ? '50%' : '48%'}
          minSize={isWide ? '320px' : '180px'}
        >
          <ScriptOutput
            isRunning={isRunning}
            result={result ?? null}
            runId={runId}
            startedAt={runStartedAt}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
