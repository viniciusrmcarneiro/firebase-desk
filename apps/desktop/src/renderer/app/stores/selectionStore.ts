import { Store } from '@tanstack/react-store';
import { initialSelectionState } from '../../app-core/workspace/workspaceState.ts';
import {
  authUserSelected,
  firestoreDocumentSelected,
  selectionReset,
  treeItemSelected,
} from '../../app-core/workspace/workspaceTransitions.ts';
import type { SelectionState } from '../../app-core/workspace/workspaceTypes.ts';

export type { SelectionState };

export const selectionStore = new Store<SelectionState>(initialSelectionState);

export const selectionActions = {
  reset() {
    selectionStore.setState(() => selectionReset());
  },
  selectTreeItem(treeItemId: string | null) {
    selectionStore.setState((state) => treeItemSelected(state, treeItemId));
  },
  selectDocument(path: string | null) {
    selectionStore.setState((state) => firestoreDocumentSelected(state, path));
  },
  selectAuthUser(uid: string | null) {
    selectionStore.setState((state) => authUserSelected(state, uid));
  },
};
