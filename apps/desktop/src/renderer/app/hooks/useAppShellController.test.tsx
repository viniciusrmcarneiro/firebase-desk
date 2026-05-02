import { HotkeysProvider } from '@firebase-desk/hotkeys';
import { AppearanceProvider } from '@firebase-desk/product-ui';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRepositories,
  RepositoryProvider,
  type RepositorySet,
} from '../RepositoryProvider.tsx';
import { selectionActions, selectionStore } from '../stores/selectionStore.ts';
import { tabActions, tabsStore, type WorkspaceTabKind } from '../stores/tabsStore.ts';
import { collectionNodeId } from '../workspaceModel.ts';
import { useAppShellController } from './useAppShellController.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  tabActions.reset();
  selectionActions.reset();
});

describe('useAppShellController', () => {
  it('builds destructive close-tab state and confirms through tab cleanup', async () => {
    const { result } = renderController({
      initialTabs: [
        { kind: 'firestore-query', connectionId: 'emu' },
        { kind: 'js-query', connectionId: 'emu' },
      ],
    });
    await waitForProjects(result);
    const activeTabId = tabsStore.state.activeTabId;
    expect(activeTabId).toBeTruthy();

    act(() => result.current.workspace.onCloseTab(activeTabId));

    await waitFor(() => expect(result.current.dialogs.destructiveAction?.title).toBe('Close tab'));
    expect(result.current.dialogs.destructiveAction?.confirmLabel).toBe('Close');

    act(() => result.current.dialogs.destructiveAction?.onConfirm());

    expect(tabsStore.state.tabs.some((tab) => tab.id === activeTabId)).toBe(false);
  });

  it('switches the active tab project and clears connection-scoped selection', async () => {
    const { result } = renderController({
      initialTabs: [{ kind: 'auth-users', connectionId: 'emu' }],
    });
    await waitForProjects(result);
    act(() => selectionActions.selectAuthUser('u_ada'));

    act(() => result.current.workspace.onConnectionChange('prod'));

    const activeTab = tabsStore.state.tabs.find((tab) => tab.id === tabsStore.state.activeTabId);
    expect(activeTab?.connectionId).toBe('prod');
    expect(selectionStore.state.authUserId).toBeNull();
    expect(result.current.workspace.lastAction).toBe('Changed tab account');
  });

  it('starts the create-document flow from a collection tree node', async () => {
    const { result } = renderController();
    await waitForProjects(result);

    act(() => result.current.sidebar.onCreateDocument(collectionNodeId('emu', 'orders')));

    await waitFor(() =>
      expect(result.current.tabView?.firestore.createDocumentRequest).toMatchObject({
        collectionPath: 'orders',
      })
    );
    expect(result.current.workspace.lastAction).toBe('Creating document in orders');
  });
});

function renderController(
  {
    initialTabs = [],
    repositories = createMockRepositories(),
  }: {
    readonly initialTabs?: ReadonlyArray<{
      readonly connectionId: string;
      readonly kind: WorkspaceTabKind;
    }>;
    readonly repositories?: RepositorySet;
  } = {},
) {
  tabActions.reset();
  selectionActions.reset();
  for (const tab of initialTabs) tabActions.openTab(tab);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  return renderHook(() => useAppShellController(), {
    wrapper: ({ children }: { readonly children: ReactNode; }) => (
      <RepositoryProvider repositories={repositories}>
        <HotkeysProvider settings={repositories.settings}>
          <AppearanceProvider settings={repositories.settings}>
            {children}
          </AppearanceProvider>
        </HotkeysProvider>
      </RepositoryProvider>
    ),
  });
}

async function waitForProjects(
  result: ReturnType<typeof renderController>['result'],
) {
  await waitFor(() => expect(result.current.workspace.projects.length).toBeGreaterThan(0));
}
