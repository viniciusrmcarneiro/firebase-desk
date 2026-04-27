import { JS_QUERY_SAMPLE_SOURCE } from '@firebase-desk/product-ui';
import type { ProjectSummary, ScriptRunResult } from '@firebase-desk/repo-contracts';
import { useState } from 'react';
import { activePath, tabActions, tabsStore, type WorkspaceTab } from '../stores/tabsStore.ts';
import { omitKey } from '../workspaceModel.ts';
import { useRunScript } from './useRepositoriesData.ts';

interface UseJsTabStateInput {
  readonly activeProject: ProjectSummary | null;
  readonly activeTab: WorkspaceTab | undefined;
  readonly initialScripts?: Readonly<Record<string, string>> | undefined;
  readonly selectedTreeItemId: string | null;
}

export interface JsTabState {
  readonly isRunning: boolean;
  readonly scriptResult: ScriptRunResult | undefined;
  readonly scripts: Readonly<Record<string, string>>;
  readonly scriptSource: string;
  readonly clearTab: (tabId: string) => void;
  readonly runScript: () => boolean;
  readonly setScriptSource: (source: string) => void;
}

export function useJsTabState(
  { activeProject, activeTab, initialScripts, selectedTreeItemId }: UseJsTabStateInput,
): JsTabState {
  const [scripts, setScripts] = useState<Readonly<Record<string, string>>>(
    () => initialScripts ?? {},
  );
  const [scriptResults, setScriptResults] = useState<Readonly<Record<string, ScriptRunResult>>>(
    {},
  );
  const runScriptMutation = useRunScript();
  const scriptSource = activeTab
    ? scripts[activeTab.id] ?? JS_QUERY_SAMPLE_SOURCE
    : JS_QUERY_SAMPLE_SOURCE;
  const scriptResult = activeTab?.kind === 'js-query' ? scriptResults[activeTab.id] : undefined;

  function setScriptSource(source: string) {
    if (!activeTab) return;
    setScripts((current) => ({ ...current, [activeTab.id]: source }));
  }

  function runScript(): boolean {
    if (!activeTab || activeTab.kind !== 'js-query' || !activeProject) return false;
    const tabId = activeTab.id;
    const accountId = activeTab.projectId;
    setScriptResults((current) => omitKey(current, tabId));
    runScriptMutation.mutate(
      { projectId: activeProject.projectId, source: scriptSource },
      {
        onSuccess: (result) => {
          const tab = tabsStore.state.tabs.find((item) => item.id === tabId);
          if (tab?.projectId !== accountId) return;
          setScriptResults((current) => ({ ...current, [tabId]: result }));
        },
      },
    );
    tabActions.recordInteraction({
      activeTabId: activeTab.id,
      path: activePath(activeTab),
      selectedTreeItemId,
    });
    return true;
  }

  function clearTab(tabId: string) {
    setScriptResults((current) => omitKey(current, tabId));
    runScriptMutation.reset();
  }

  return {
    isRunning: activeTab?.kind === 'js-query' && runScriptMutation.isPending,
    scriptResult,
    scripts,
    scriptSource,
    clearTab,
    runScript,
    setScriptSource,
  };
}
