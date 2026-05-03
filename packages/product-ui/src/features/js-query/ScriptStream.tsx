import type { ScriptStreamItem, SettingsRepository } from '@firebase-desk/repo-contracts';
import { Badge, EmptyState } from '@firebase-desk/ui';
import { TerminalSquare } from 'lucide-react';
import { JsonPreview } from './JsonPreview.tsx';
import { ScriptFirestorePreview } from './ScriptFirestorePreview.tsx';

export function ScriptStream(
  {
    items,
    settings,
  }: {
    readonly items: ReadonlyArray<ScriptStreamItem>;
    readonly settings?: SettingsRepository | undefined;
  },
) {
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
    <div className='grid select-text content-start gap-2 p-3'>
      {items.map((item) => <ScriptStreamCard key={item.id} item={item} settings={settings} />)}
    </div>
  );
}

function ScriptStreamCard(
  {
    item,
    settings,
  }: {
    readonly item: ScriptStreamItem;
    readonly settings?: SettingsRepository | undefined;
  },
) {
  return (
    <details className='overflow-hidden rounded-md border border-border-subtle bg-bg-panel shadow-sm'>
      <summary className='flex cursor-pointer select-text list-inside flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-bg-subtle px-3 py-2 text-sm font-semibold text-text-primary'>
        <span>{item.label}</span>
        <Badge>{item.badge}</Badge>
      </summary>
      {item.view === 'table'
        ? <ScriptFirestorePreview settings={settings} value={item.value} />
        : (
          <div className='p-3'>
            <JsonPreview value={item.value} />
          </div>
        )}
    </details>
  );
}
