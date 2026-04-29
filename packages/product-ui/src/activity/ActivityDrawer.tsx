import {
  ACTIVITY_LOG_AREAS,
  ACTIVITY_LOG_STATUSES,
  type ActivityLogArea,
  type ActivityLogEntry,
  type ActivityLogStatus,
} from '@firebase-desk/repo-contracts';
import { Badge, Button, cn, DockedPanel, Input } from '@firebase-desk/ui';
import { Download, ExternalLink, Maximize2, Minimize2, Trash2, X } from 'lucide-react';

export interface ActivityDrawerProps {
  readonly area: ActivityLogArea | 'all';
  readonly entries: ReadonlyArray<ActivityLogEntry>;
  readonly expanded?: boolean | undefined;
  readonly isLoading?: boolean | undefined;
  readonly onAreaChange: (area: ActivityLogArea | 'all') => void;
  readonly onClear: () => void;
  readonly onClose: () => void;
  readonly onExport: () => void;
  readonly onExpandedChange?: ((expanded: boolean) => void) | undefined;
  readonly onOpenTarget?: ((entry: ActivityLogEntry) => void) | undefined;
  readonly onSearchChange: (search: string) => void;
  readonly onStatusChange: (status: ActivityLogStatus | 'all') => void;
  readonly open: boolean;
  readonly search: string;
  readonly status: ActivityLogStatus | 'all';
}

export function ActivityDrawer(
  {
    area,
    entries,
    expanded = false,
    isLoading = false,
    onAreaChange,
    onClear,
    onClose,
    onExport,
    onExpandedChange,
    onOpenTarget,
    onSearchChange,
    onStatusChange,
    open,
    search,
    status,
  }: ActivityDrawerProps,
) {
  if (!open) return null;
  return (
    <DockedPanel
      aria-label='Activity'
      className={cn(
        'z-popover grid min-h-0',
        expanded ? 'h-[70vh] max-h-[720px]' : 'h-80',
      )}
    >
      <header className='flex h-10 items-center gap-2 border-b border-border-subtle px-3'>
        <div className='min-w-0 flex-1'>
          <div className='text-sm font-semibold text-text-primary'>Activity</div>
        </div>
        <Button size='xs' variant='secondary' onClick={onExport}>
          <Download size={13} aria-hidden='true' /> Export
        </Button>
        {onExpandedChange
          ? (
            <Button
              aria-expanded={expanded}
              size='xs'
              variant='secondary'
              onClick={() => onExpandedChange(!expanded)}
            >
              {expanded
                ? <Minimize2 size={13} aria-hidden='true' />
                : <Maximize2 size={13} aria-hidden='true' />}
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
          )
          : null}
        <Button size='xs' variant='secondary' onClick={onClear}>
          <Trash2 size={13} aria-hidden='true' /> Clear
        </Button>
        <Button size='xs' variant='ghost' onClick={onClose}>
          <X size={13} aria-hidden='true' /> Close
        </Button>
      </header>
      <div className='grid min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
        <div className='flex items-center gap-2 border-b border-border-subtle p-2'>
          <Input
            aria-label='Search activity'
            className='min-w-0 flex-1'
            placeholder='Search activity'
            value={search}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
          />
          <select
            aria-label='Activity area'
            className='h-[var(--density-compact-control-height)] rounded-md border border-border bg-bg-panel px-2 text-sm text-text-primary'
            value={area}
            onChange={(event) => onAreaChange(event.currentTarget.value as ActivityLogArea | 'all')}
          >
            <option value='all'>all areas</option>
            {ACTIVITY_LOG_AREAS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            aria-label='Activity status'
            className='h-[var(--density-compact-control-height)] rounded-md border border-border bg-bg-panel px-2 text-sm text-text-primary'
            value={status}
            onChange={(event) =>
              onStatusChange(event.currentTarget.value as ActivityLogStatus | 'all')}
          >
            <option value='all'>all statuses</option>
            {ACTIVITY_LOG_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className='min-h-0 overflow-auto'>
          {isLoading
            ? <div className='p-4 text-sm text-text-secondary'>Loading activity</div>
            : entries.length === 0
            ? <div className='p-4 text-sm text-text-secondary'>No activity</div>
            : entries.map((entry) => (
              <details key={entry.id} className='border-b border-border-subtle'>
                <summary className='grid cursor-pointer grid-cols-[112px_92px_86px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-xs hover:bg-action-ghost-hover'>
                  <span className='font-mono text-text-muted'>{timeLabel(entry.timestamp)}</span>
                  <Badge variant={badgeVariant(entry.status)}>{entry.status}</Badge>
                  <span className='font-mono text-text-secondary'>{entry.area}</span>
                  <span className='min-w-0 truncate text-sm text-text-primary'>
                    {entry.action}
                    <span className='text-text-muted'>· {entry.summary}</span>
                  </span>
                  <span className='flex items-center gap-2'>
                    {entry.durationMs !== undefined
                      ? <span className='font-mono text-text-muted'>{entry.durationMs}ms</span>
                      : null}
                    {onOpenTarget && entry.target
                      ? (
                        <Button
                          size='xs'
                          variant='ghost'
                          onClick={(event) => {
                            event.preventDefault();
                            onOpenTarget(entry);
                          }}
                        >
                          <ExternalLink size={13} aria-hidden='true' /> Open
                        </Button>
                      )
                      : null}
                  </span>
                </summary>
                <div className='grid gap-2 bg-bg-subtle px-3 py-2 text-xs'>
                  {entry.target
                    ? <ActivityDetail label='Target' value={targetLabel(entry)} />
                    : null}
                  {entry.error
                    ? <ActivityDetail label='Error' value={entry.error.message} />
                    : null}
                  <JsonBlock label='Metadata' value={entry.metadata ?? {}} />
                  {entry.payload ? <JsonBlock label='Payload' value={entry.payload} /> : null}
                </div>
              </details>
            ))}
        </div>
      </div>
    </DockedPanel>
  );
}

function ActivityDetail({ label, value }: { readonly label: string; readonly value: string; }) {
  return (
    <div className='grid grid-cols-[80px_minmax(0,1fr)] gap-2'>
      <span className='text-text-muted'>{label}</span>
      <span className='min-w-0 break-all font-mono text-text-secondary'>{value}</span>
    </div>
  );
}

function JsonBlock({ label, value }: { readonly label: string; readonly value: unknown; }) {
  return (
    <div className='grid gap-1'>
      <span className='text-text-muted'>{label}</span>
      <pre className='max-h-32 overflow-auto rounded-md border border-border-subtle bg-bg-panel p-2 font-mono text-xs text-text-secondary'>
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function badgeVariant(status: ActivityLogStatus): 'danger' | 'neutral' | 'success' | 'warning' {
  if (status === 'success') return 'success';
  if (status === 'failure') return 'danger';
  if (status === 'conflict') return 'warning';
  return 'neutral';
}

function targetLabel(entry: ActivityLogEntry): string {
  return entry.target?.path ?? entry.target?.uid ?? entry.target?.label ?? entry.target?.type ?? '';
}

function timeLabel(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}
