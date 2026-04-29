import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
} from '@firebase-desk/repo-contracts';
import { documentsForCollectionNode } from './resultModel.tsx';

export interface DeleteDocumentOptions {
  readonly deleteSubcollectionPaths: ReadonlyArray<string>;
  readonly deleteDescendantDocumentPaths: ReadonlyArray<string>;
}

export function buildDeleteDocumentOptions(
  document: FirestoreDocumentResult,
  selectedSubcollectionPaths: ReadonlySet<string>,
): DeleteDocumentOptions {
  const deleteSubcollectionPaths = document.subcollections
    ?.map((collection) => collection.path)
    .filter((path) => selectedSubcollectionPaths.has(path)) ?? [];
  return {
    deleteSubcollectionPaths,
    deleteDescendantDocumentPaths: uniqueStrings(
      document.subcollections
        ?.filter((collection) => selectedSubcollectionPaths.has(collection.path))
        .flatMap((collection) => descendantDocumentPaths(collection)) ?? [],
    ),
  };
}

export function descendantDocumentPaths(
  collection: FirestoreCollectionNode,
): ReadonlyArray<string> {
  return documentsForCollectionNode(collection).flatMap((document) => [
    document.path,
    ...(document.subcollections ?? []).flatMap((childCollection) =>
      descendantDocumentPaths(childCollection)
    ),
  ]);
}

function uniqueStrings(values: ReadonlyArray<string>): ReadonlyArray<string> {
  const unique = new Set<string>();
  for (const value of values) unique.add(value);
  return Array.from(unique);
}
