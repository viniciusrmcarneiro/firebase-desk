import { useEffect, useState } from 'react';

export function useElapsedMs(isRunning: boolean, startedAt: number | null): number {
  const [elapsedMs, setElapsedMs] = useState(() => elapsedFrom(startedAt));

  useEffect(() => {
    if (!isRunning) {
      setElapsedMs(0);
      return;
    }
    if (startedAt === null) return;
    const update = () => setElapsedMs(elapsedFrom(startedAt));
    update();
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [isRunning, startedAt]);

  return elapsedMs;
}

function elapsedFrom(startedAt: number | null): number {
  return startedAt === null ? 0 : Math.max(0, Date.now() - startedAt);
}
