import { describe, expect, it } from 'vitest';
import {
  openWorkspaceTreeItemCommand,
  selectWorkspaceTreeItemCommand,
} from './workspaceTreeCommands.ts';

describe('workspace tree commands', () => {
  it('selects collection, auth, and script nodes as open intents', () => {
    expect(selectWorkspaceTreeItemCommand({
      activeTab: { id: 'tab-1', path: 'orders' },
      item: { connectionId: 'emu', kind: 'collection', path: 'customers' },
      selectedTreeItemId: 'collection:emu:customers',
    })).toEqual({
      lastAction: 'Opened customers',
      selectedTreeItemId: 'collection:emu:customers',
      target: {
        connectionId: 'emu',
        newTab: false,
        path: 'customers',
        type: 'open-firestore',
      },
    });

    expect(
      selectWorkspaceTreeItemCommand({
        activeTab: null,
        item: { connectionId: 'emu', kind: 'auth' },
        selectedTreeItemId: 'auth:emu',
      }).target,
    ).toEqual({
      connectionId: 'emu',
      kind: 'auth-users',
      newTab: false,
      path: 'auth/users',
      type: 'open-tool',
    });

    expect(
      selectWorkspaceTreeItemCommand({
        activeTab: null,
        item: { connectionId: 'emu', kind: 'script' },
        selectedTreeItemId: 'script:emu',
      }).target,
    ).toEqual({
      connectionId: 'emu',
      kind: 'js-query',
      newTab: false,
      path: 'scripts/default',
      type: 'open-tool',
    });
  });

  it('records project and firestore selection against the active tab', () => {
    expect(selectWorkspaceTreeItemCommand({
      activeTab: { id: 'tab-1', path: 'orders' },
      item: { connectionId: 'emu', kind: 'firestore' },
      selectedTreeItemId: 'firestore:emu',
    })).toEqual({
      lastAction: 'Selected Firestore',
      selectedTreeItemId: 'firestore:emu',
      target: { activeTabId: 'tab-1', path: 'orders', type: 'current' },
    });
  });

  it('opens script and collection nodes in new tabs from explicit open actions', () => {
    expect(openWorkspaceTreeItemCommand({ connectionId: 'emu', kind: 'script' })).toEqual({
      target: {
        connectionId: 'emu',
        kind: 'js-query',
        newTab: true,
        path: 'scripts/default',
        type: 'open-tool',
      },
    });

    expect(openWorkspaceTreeItemCommand({
      connectionId: 'emu',
      kind: 'collection',
      path: 'orders',
    })).toEqual({
      target: {
        connectionId: 'emu',
        newTab: true,
        path: 'orders',
        type: 'open-firestore',
      },
    });
  });
});
