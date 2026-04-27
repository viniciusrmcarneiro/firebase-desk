import { z } from 'zod';
import { pageOf, PageRequestSchema } from './pagination.ts';

export const FirestoreCollectionNodeSchema = z.object({
  path: z.string(),
  id: z.string(),
  documentCount: z.number().int().nonnegative().optional(),
});

export const FirestoreDocumentNodeSchema = z.object({
  path: z.string(),
  id: z.string(),
  hasSubcollections: z.boolean(),
});

export const FirestoreFilterOpSchema = z.enum([
  '==',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  'in',
  'not-in',
  'array-contains',
  'array-contains-any',
]);

export const FirestoreFilterSchema = z.object({
  field: z.string(),
  op: FirestoreFilterOpSchema,
  value: z.unknown(),
});

export const FirestoreSortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
});

export const FirestoreQuerySchema = z.object({
  connectionId: z.string(),
  path: z.string(),
  filters: z.array(FirestoreFilterSchema).optional(),
  sorts: z.array(FirestoreSortSchema).optional(),
});

export const FirestoreDocumentResultSchema = z.object({
  id: z.string(),
  path: z.string(),
  data: z.record(z.string(), z.unknown()),
  hasSubcollections: z.boolean(),
  subcollections: z.array(FirestoreCollectionNodeSchema).optional(),
});

export const ListDocumentsRequestSchema = z.object({
  connectionId: z.string(),
  collectionPath: z.string(),
  request: PageRequestSchema.optional(),
});

export const RunQueryRequestSchema = z.object({
  query: FirestoreQuerySchema,
  request: PageRequestSchema.optional(),
});

export const FirestoreDocumentsPageSchema = pageOf(FirestoreDocumentNodeSchema);
export const FirestoreResultsPageSchema = pageOf(FirestoreDocumentResultSchema);
