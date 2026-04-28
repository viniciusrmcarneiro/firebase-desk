import { Button, Panel, PanelBody, PanelHeader } from '@firebase-desk/ui';
import { Play, Square } from 'lucide-react';
import { CodeEditor } from '../../code-editor/CodeEditor.tsx';

export interface JsQueryEditorPanelProps {
  readonly isRunning: boolean;
  readonly onCancel: () => void;
  readonly onRun: () => void;
  readonly onSourceChange: (source: string) => void;
  readonly source: string;
}

export function JsQueryEditorPanel(
  { isRunning, onCancel, onRun, onSourceChange, source }: JsQueryEditorPanelProps,
) {
  return (
    <Panel className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
      <PanelHeader
        actions={
          <Button
            variant={isRunning ? 'warning' : 'primary'}
            onClick={isRunning ? onCancel : onRun}
          >
            {isRunning
              ? (
                <>
                  <Square size={13} aria-hidden='true' /> Cancel
                </>
              )
              : (
                <>
                  <Play size={14} aria-hidden='true' /> Run
                </>
              )}
          </Button>
        }
      >
        JavaScript Query
      </PanelHeader>
      <PanelBody className='min-h-0 p-0'>
        <CodeEditor
          readOnly={isRunning}
          language='javascript'
          value={source}
          onChange={onSourceChange}
        />
      </PanelBody>
    </Panel>
  );
}
