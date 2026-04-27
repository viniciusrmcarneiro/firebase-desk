import { Store } from '@tanstack/react-store';

export interface SelectionState {
  readonly authUserId: string | null;
  readonly firestoreDocumentPath: string | null;
  readonly treeItemId: string | null;
}

const initialSelectionState: SelectionState = {
  authUserId: null,
  firestoreDocumentPath: null,
  treeItemId: null,
};

export const selectionStore = new Store<SelectionState>(initialSelectionState);

export const selectionActions = {
  reset() {
    selectionStore.setState(() => initialSelectionState);
  },
  selectTreeItem(treeItemId: string | null) {
    selectionStore.setState((state) => ({ ...state, treeItemId }));
  },
  selectDocument(path: string | null) {
    selectionStore.setState((state) => ({ ...state, firestoreDocumentPath: path }));
  },
  selectAuthUser(uid: string | null) {
    selectionStore.setState((state) => ({ ...state, authUserId: uid }));
  },
};
