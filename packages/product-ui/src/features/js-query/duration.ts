export function formatDuration(durationMs: number): string {
  const ms = Math.max(0, Math.trunc(durationMs));
  if (ms < 1_000) return `${ms}ms`;
  const milliseconds = String(ms % 1_000).padStart(3, '0');
  const totalSeconds = Math.floor(ms / 1_000);
  if (totalSeconds < 60) return `${totalSeconds}.${milliseconds}s`;
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds}.${milliseconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = String(minutes % 60).padStart(2, '0');
  return `${hours}h ${remainingMinutes}m ${seconds}.${milliseconds}s`;
}
