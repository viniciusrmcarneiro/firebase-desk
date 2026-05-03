import { beforeEach, describe, expect, it } from 'vitest';
import { selectionActions, selectionStore } from './selectionStore.ts';

describe('selectionStore', () => {
  beforeEach(() => selectionActions.reset());

  it('tracks tree and auth selections independently', () => {
    selectionActions.selectTreeItem('collection:emu:orders');
    selectionActions.selectAuthUser('u_ada');
    expect(selectionStore.state).toEqual({
      authUserId: 'u_ada',
      treeItemId: 'collection:emu:orders',
    });
  });
});
