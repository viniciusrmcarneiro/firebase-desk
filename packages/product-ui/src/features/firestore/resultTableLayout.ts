import type {
  ResultTableLayout,
  ResultTableLayouts,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import { type DataTableColumn, sanitizeDataTableColumnLayout } from '@firebase-desk/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SAVE_DELAY_MS = 250;

export function collectionLayoutKeyForPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const collectionParts = parts.filter((_, index) => index % 2 === 0);
  return collectionParts.join('/') || 'query';
}

export function useResultTableLayout<TData>(
  {
    columns,
    queryPath,
    settings,
  }: {
    readonly columns: ReadonlyArray<DataTableColumn<TData>>;
    readonly queryPath: string;
    readonly settings?: SettingsRepository | undefined;
  },
) {
  const key = useMemo(() => collectionLayoutKeyForPath(queryPath), [queryPath]);
  const [layouts, setLayouts] = useState<ResultTableLayouts>({});
  const mountedRef = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedLayout = layouts[key] ?? null;
  const sanitizedLayout = useMemo(
    () => sanitizeDataTableColumnLayout(columns, savedLayout),
    [columns, savedLayout],
  );

  useEffect(() => {
    if (!settings) {
      setLayouts({});
      return;
    }
    let cancelled = false;
    settings.load().then((snapshot) => {
      if (!cancelled) setLayouts(snapshot.resultTableLayouts);
    }).catch(() => {
      if (!cancelled) setLayouts({});
    });
    return () => {
      cancelled = true;
    };
  }, [settings]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const persistLayout = useCallback(
    (layout: ResultTableLayout | null) => {
      if (!settings) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        settings.load()
          .then((snapshot) => {
            const next = { ...snapshot.resultTableLayouts };
            if (layout) next[key] = layout;
            else delete next[key];
            return settings.save({ resultTableLayouts: next });
          })
          .then((snapshot) => {
            if (mountedRef.current) setLayouts(snapshot.resultTableLayouts);
          })
          .catch(() => undefined);
      }, SAVE_DELAY_MS);
    },
    [key, settings],
  );

  const saveLayout = useCallback(
    (layout: ResultTableLayout) => {
      setLayouts((current) => ({ ...current, [key]: layout }));
      persistLayout(layout);
    },
    [key, persistLayout],
  );

  const resetLayout = useCallback(() => {
    setLayouts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    persistLayout(null);
  }, [key, persistLayout]);

  return {
    hasSavedLayout: Boolean(savedLayout),
    layout: sanitizedLayout,
    resetLayout,
    saveLayout,
  };
}
