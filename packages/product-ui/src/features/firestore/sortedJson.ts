export function stringifySortedJson(value: unknown): string {
  return JSON.stringify(sortJsonProperties(value), null, 2);
}

export function sortJsonProperties(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonProperties);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    sortedObjectEntries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, sortJsonProperties(entry)]),
  );
}

export function sortedObjectEntries(
  value: Record<string, unknown>,
): ReadonlyArray<readonly [string, unknown]> {
  return mergeSortEntries(Object.entries(value));
}

function mergeSortEntries(
  entries: ReadonlyArray<readonly [string, unknown]>,
): ReadonlyArray<readonly [string, unknown]> {
  if (entries.length < 2) return entries;
  const midpoint = Math.floor(entries.length / 2);
  return mergeEntries(
    mergeSortEntries(entries.slice(0, midpoint)),
    mergeSortEntries(entries.slice(midpoint)),
  );
}

function mergeEntries(
  left: ReadonlyArray<readonly [string, unknown]>,
  right: ReadonlyArray<readonly [string, unknown]>,
): ReadonlyArray<readonly [string, unknown]> {
  const merged: Array<readonly [string, unknown]> = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftEntry = left[leftIndex]!;
    const rightEntry = right[rightIndex]!;
    if (leftEntry[0].localeCompare(rightEntry[0]) <= 0) {
      merged.push(leftEntry);
      leftIndex += 1;
    } else {
      merged.push(rightEntry);
      rightIndex += 1;
    }
  }
  return merged.concat(left.slice(leftIndex), right.slice(rightIndex));
}
