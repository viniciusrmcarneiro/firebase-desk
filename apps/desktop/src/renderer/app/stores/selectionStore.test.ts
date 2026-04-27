import { beforeEach, describe, expect, it } from 'vitest';
import { selectionActions, selectionStore } from './selectionStore.ts';

describe('selectionStore', () => {
  beforeEach(() => selectionActions.reset());

  it('tracks tree, document, and auth selections independently', () => {
    selectionActions.selectTreeItem('collection:emu:orders');
    selectionActions.selectDocument('orders/ord_1024');
    selectionActions.selectAuthUser('u_ada');
    expect(selectionStore.state).toEqual({
      authUserId: 'u_ada',
      firestoreDocumentPath: 'orders/ord_1024',
      treeItemId: 'collection:emu:orders',
    });
  });
});
