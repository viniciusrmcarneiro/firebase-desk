import { z } from 'zod';
import { pageOf, PageRequestSchema } from './pagination.ts';

const PathSegmentSchema = z.string().min(1);
const DocumentPathSchema = z.string().refine((path) => isDocumentPath(path), {
  message: 'Document path must have an even number of path segments.',
});
const CollectionPathSchema = z.string().refine((path) => isCollectionPath(path), {
  message: 'Collection path must have an odd number of path segments.',
});
const Base64Schema = z.string().refine((value) => isBase64(value), {
  message: 'Bytes value must be base64.',
});
const TimestampSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Timestamp value must be a valid date string.',
});
const FirestoreEncodedValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(FirestoreEncodedValueSchema),
    z.object({ __type__: z.literal('timestamp'), value: TimestampSchema }),
    z.object({ __type__: z.literal('geoPoint'), latitude: z.number(), longitude: z.number() }),
    z.object({ __type__: z.literal('reference'), path: DocumentPathSchema }),
    z.object({ __type__: z.literal('bytes'), base64: Base64Schema }),
    z.object({ __type__: z.literal('array'), value: z.array(FirestoreEncodedValueSchema) }),
    z.object({
      __type__: z.literal('map'),
      value: z.record(z.string(), FirestoreEncodedValueSchema),
    }),
    z.record(z.string(), FirestoreEncodedValueSchema).superRefine((value, context) => {
      if (typeof value['__type__'] === 'string') {
        context.addIssue({
          code: 'custom',
          message: `Unknown encoded __type__: ${value['__type__']}.`,
          path: ['__type__'],
        });
      }
    }),
  ])
);
export const FirestoreDocumentDataSchema = z.record(z.string(), FirestoreEncodedValueSchema);

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
  data: FirestoreDocumentDataSchema,
  hasSubcollections: z.boolean(),
  subcollections: z.array(FirestoreCollectionNodeSchema).optional(),
});

export const FirestoreDeleteDocumentOptionsSchema = z.object({
  deleteSubcollectionPaths: z.array(CollectionPathSchema),
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

export const SaveDocumentRequestSchema = z.object({
  connectionId: z.string(),
  documentPath: DocumentPathSchema,
  data: FirestoreDocumentDataSchema,
});

export const DeleteDocumentRequestSchema = z.object({
  connectionId: z.string(),
  documentPath: DocumentPathSchema,
  options: FirestoreDeleteDocumentOptionsSchema.optional(),
});

export const FirestoreDocumentsPageSchema = pageOf(FirestoreDocumentNodeSchema);
export const FirestoreResultsPageSchema = pageOf(FirestoreDocumentResultSchema);

function isDocumentPath(path: string): boolean {
  const parts = pathSegments(path);
  return parts.length > 0 && parts.length % 2 === 0;
}

function isCollectionPath(path: string): boolean {
  const parts = pathSegments(path);
  return parts.length > 0 && parts.length % 2 === 1;
}

function pathSegments(path: string): ReadonlyArray<string> {
  const parts = path.split('/');
  if (!parts.every((part) => PathSegmentSchema.safeParse(part).success)) return [];
  return parts;
}

function isBase64(value: string): boolean {
  if (value === '') return true;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0;
}
