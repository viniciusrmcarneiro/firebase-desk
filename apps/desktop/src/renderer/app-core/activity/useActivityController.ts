import type {
  ActivityLogAppendInput,
  ActivityLogArea,
  ActivityLogEntry,
  ActivityLogRepository,
  ActivityLogStatus,
} from '@firebase-desk/repo-contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppCoreStore } from '../shared/reactStore.ts';
import {
  clearActivity,
  createActivityOpenTargetIntent,
  exportActivity,
  loadActivity,
  loadLatestActivityIssue,
  recordActivity,
} from './activityCommands.ts';
import { selectActivityButtonModel, selectActivityDrawerModel } from './activitySelectors.ts';
import { type ActivityStore, createActivityStore } from './activityStore.ts';
import {
  activityClosed,
  activityExpandedChanged,
  activityFiltersChanged,
  activityOpened,
} from './activityTransitions.ts';

export interface UseActivityControllerInput {
  readonly loadIssuePreviewOnMount?: boolean | undefined;
  readonly onStatus?: ((message: string) => void) | undefined;
  readonly repository: ActivityLogRepository;
  readonly store?: ActivityStore | undefined;
}

export function useActivityController(
  {
    loadIssuePreviewOnMount = true,
    onStatus,
    repository,
    store: inputStore,
  }: UseActivityControllerInput,
) {
  const [ownedStore] = useState(createActivityStore);
  const store = inputStore ?? ownedStore;
  const state = useAppCoreStore(store);
  const env = useMemo(() => ({ onStatus, repository }), [onStatus, repository]);

  const load = useCallback(() => {
    void loadActivity(store, env);
  }, [env, store]);

  useEffect(() => {
    if (!loadIssuePreviewOnMount) return;
    void loadLatestActivityIssue(store, env);
  }, [env, loadIssuePreviewOnMount, store]);

  useEffect(() => {
    if (state.open) load();
  }, [load, state.filters, state.open]);

  const open = useCallback(() => {
    store.update(activityOpened);
  }, [store]);

  const close = useCallback(() => {
    store.update(activityClosed);
  }, [store]);

  const toggle = useCallback(() => {
    store.update((current) => current.open ? activityClosed(current) : activityOpened(current));
  }, [store]);

  const setExpanded = useCallback((expanded: boolean) => {
    store.update((current) => activityExpandedChanged(current, expanded));
  }, [store]);

  const setArea = useCallback((area: ActivityLogArea | 'all') => {
    store.update((current) => activityFiltersChanged(current, { area }));
  }, [store]);

  const setSearch = useCallback((search: string) => {
    store.update((current) => activityFiltersChanged(current, { search }));
  }, [store]);

  const setStatus = useCallback((status: ActivityLogStatus | 'all') => {
    store.update((current) => activityFiltersChanged(current, { status }));
  }, [store]);

  const record = useCallback((input: ActivityLogAppendInput) => {
    void recordActivity(store, env, input);
  }, [env, store]);

  const clear = useCallback(() => {
    void clearActivity(store, env);
  }, [env, store]);

  const exportEntries = useCallback(() => {
    void exportActivity(store, env);
  }, [env, store]);

  const openTargetIntent = useCallback((entry: ActivityLogEntry) => {
    return createActivityOpenTargetIntent(entry);
  }, []);

  return {
    button: selectActivityButtonModel(state),
    clear,
    close,
    drawer: selectActivityDrawerModel(state),
    exportEntries,
    load,
    open,
    openTargetIntent,
    record,
    setArea,
    setExpanded,
    setSearch,
    setStatus,
    state,
    toggle,
  };
}
