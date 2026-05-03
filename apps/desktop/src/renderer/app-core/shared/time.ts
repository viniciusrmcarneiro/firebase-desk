export function elapsedMs(startedAt: number, endedAt: number): number {
  return Math.max(0, endedAt - startedAt);
}
