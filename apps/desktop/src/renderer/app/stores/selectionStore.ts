import { Store } from '@tanstack/react-store';
import {
  authUserSelected,
  firestoreDocumentSelected,
  initialSelectionState,
  selectionReset,
  type SelectionState,
  treeItemSelected,
} from '../../app-core/workspace/index.ts';

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
