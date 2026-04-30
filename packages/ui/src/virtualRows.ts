import type { Key } from 'react';

export interface MinimalVirtualRow {
  readonly index: number;
  readonly key: Key;
  readonly start: number;
}

export function visibleVirtualRows(
  virtualRows: ReadonlyArray<MinimalVirtualRow>,
  rowCount: number,
  rowHeight: number,
  maxFallbackRows = 50,
): ReadonlyArray<MinimalVirtualRow> {
  if (virtualRows.length > 0 || rowCount === 0) return virtualRows;
  const fallbackCount = Math.min(rowCount, maxFallbackRows);
  return Array.from({ length: fallbackCount }, (_, index) => ({
    index,
    key: index,
    start: index * rowHeight,
  }));
}
