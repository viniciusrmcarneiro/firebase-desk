import { type ReactNode } from 'react';
import { Badge } from '../badge/index.ts';
import { cn } from '../cn.ts';

export interface ChipListProps<TItem> {
  readonly className?: string;
  readonly getKey: (item: TItem, index: number) => string;
  readonly items: ReadonlyArray<TItem>;
  readonly maxItems: number;
  readonly renderItem: (item: TItem, index: number) => ReactNode;
  readonly renderOverflow?: (count: number) => ReactNode;
}

export function ChipList<TItem>(
  { className, getKey, items, maxItems, renderItem, renderOverflow }: ChipListProps<TItem>,
) {
  const visibleItems = items.slice(0, Math.max(0, maxItems));
  const hiddenCount = items.length - visibleItems.length;
  return (
    <span className={cn('flex min-w-0 flex-wrap gap-1', className)}>
      {visibleItems.map((item, index) => (
        <span key={getKey(item, index)}>{renderItem(item, index)}</span>
      ))}
      {hiddenCount > 0 ? renderOverflow?.(hiddenCount) ?? <Badge>+{hiddenCount}</Badge> : null}
    </span>
  );
}
