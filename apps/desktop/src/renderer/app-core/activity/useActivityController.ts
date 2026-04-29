import type {
  ActivityLogAppendInput,
  ActivityLogArea,
  ActivityLogEntry,
  ActivityLogRepository,
  ActivityLogStatus,
} from '@firebase-desk/repo-contracts';
import { useSelector } from '@tanstack/react-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearActivity,
  createActivityOpenTargetIntent,
  exportActivity,
  loadActivity,
  loadLatestActivityIssue,
  recordActivity,
} from './activityCommands.ts';
import { selectActivityButtonModel, selectActivityDrawerModel } from './activitySelectors.ts';
import { createActivityStore } from './activityStore.ts';
import {
  activityClosed,
  activityExpandedChanged,
  activityFiltersChanged,
  activityOpened,
} from './activityTransitions.ts';

export interface UseActivityControllerInput {
  readonly onStatus?: ((message: string) => void) | undefined;
  readonly repository: ActivityLogRepository;
}

export function useActivityController(
  { onStatus, repository }: UseActivityControllerInput,
) {
  const [store] = useState(createActivityStore);
  const state = useSelector(store, (value) => value);
  const env = useMemo(() => ({ onStatus, repository }), [onStatus, repository]);

  const load = useCallback(() => {
    void loadActivity(store, env);
  }, [env, store]);

  useEffect(() => {
    void loadLatestActivityIssue(store, env);
  }, [env, store]);

  useEffect(() => {
    if (state.open) load();
  }, [load, state.filters, state.open]);

  const open = useCallback(() => {
    store.setState(activityOpened);
  }, [store]);

  const close = useCallback(() => {
    store.setState(activityClosed);
  }, [store]);

  const toggle = useCallback(() => {
    store.setState((current) => current.open ? activityClosed(current) : activityOpened(current));
  }, [store]);

  const setExpanded = useCallback((expanded: boolean) => {
    store.setState((current) => activityExpandedChanged(current, expanded));
  }, [store]);

  const setArea = useCallback((area: ActivityLogArea | 'all') => {
    store.setState((current) => activityFiltersChanged(current, { area }));
  }, [store]);

  const setSearch = useCallback((search: string) => {
    store.setState((current) => activityFiltersChanged(current, { search }));
  }, [store]);

  const setStatus = useCallback((status: ActivityLogStatus | 'all') => {
    store.setState((current) => activityFiltersChanged(current, { status }));
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
