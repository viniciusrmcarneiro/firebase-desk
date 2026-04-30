import { FIRESTORE_FIELD_STALE_BEHAVIORS } from '@firebase-desk/repo-contracts';
import { z } from 'zod';
import { pageOf, PageRequestSchema } from './pagination.ts';

const PathSegmentSchema = z.string().min(1);
const FieldPathSegmentSchema = PathSegmentSchema.refine((value) => !/^__.*__$/.test(value), {
  message: 'Field path segments cannot match __.*__.',
}).refine((value) => utf8ByteLength(value) <= 1500, {
  message: 'Field path segments must be 1,500 bytes or less.',
});
export const DocumentPathSchema = z.string().refine((path) => isDocumentPath(path), {
  message: 'Document path must have an even number of path segments.',
});
export const CollectionPathSchema = z.string().refine((path) => isCollectionPath(path), {
  message: 'Collection path must have an odd number of path segments.',
});
const DocumentIdSchema = z.string().refine(
  (value) => value.trim().length > 0 && !value.includes('/'),
  {
    message: 'Document ID must be one non-empty path segment.',
  },
);
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
  path: CollectionPathSchema,
  filters: z.array(FirestoreFilterSchema).optional(),
  sorts: z.array(FirestoreSortSchema).optional(),
});

export const FirestoreDocumentResultSchema = z.object({
  id: z.string(),
  path: z.string(),
  data: FirestoreDocumentDataSchema,
  hasSubcollections: z.boolean(),
  subcollections: z.array(FirestoreCollectionNodeSchema).optional(),
  updateTime: z.string().optional(),
});

export const FirestoreDeleteDocumentOptionsSchema = z.object({
  deleteSubcollectionPaths: z.array(CollectionPathSchema),
});

export const FirestoreSaveDocumentOptionsSchema = z.object({
  lastUpdateTime: z.string().min(1).optional(),
});

export const FirestoreUpdateDocumentFieldsOptionsSchema = z.object({
  lastUpdateTime: z.string().min(1).optional(),
  staleBehavior: z.enum(FIRESTORE_FIELD_STALE_BEHAVIORS),
});

export const FirestoreFieldPatchOperationSchema = z.discriminatedUnion('type', [
  z.object({
    baseValue: FirestoreEncodedValueSchema.optional(),
    fieldPath: z.array(FieldPathSegmentSchema).min(1),
    type: z.literal('delete'),
  }),
  z.object({
    baseValue: FirestoreEncodedValueSchema.optional(),
    fieldPath: z.array(FieldPathSegmentSchema).min(1),
    type: z.literal('set'),
    value: FirestoreEncodedValueSchema,
  }),
]);

export const FirestoreGeneratedDocumentIdSchema = z.object({
  documentId: DocumentIdSchema,
});

export const FirestoreSaveDocumentResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('saved'),
    document: FirestoreDocumentResultSchema,
  }),
  z.object({
    status: z.literal('conflict'),
    remoteDocument: FirestoreDocumentResultSchema.nullable(),
  }),
]);

export const FirestoreUpdateDocumentFieldsResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('saved'),
    document: FirestoreDocumentResultSchema,
    documentChanged: z.boolean().optional(),
  }),
  z.object({
    status: z.literal('document-changed'),
    remoteDocument: FirestoreDocumentResultSchema.nullable(),
  }),
  z.object({
    status: z.literal('conflict'),
    remoteDocument: FirestoreDocumentResultSchema.nullable(),
  }),
]);

export const ListDocumentsRequestSchema = z.object({
  connectionId: z.string(),
  collectionPath: CollectionPathSchema,
  request: PageRequestSchema.optional(),
});

export const ListSubcollectionsRequestSchema = z.object({
  connectionId: z.string(),
  documentPath: DocumentPathSchema,
});

export const GetDocumentRequestSchema = z.object({
  connectionId: z.string(),
  documentPath: DocumentPathSchema,
});

export const RunQueryRequestSchema = z.object({
  query: FirestoreQuerySchema,
  request: PageRequestSchema.optional(),
});

export const SaveDocumentRequestSchema = z.object({
  connectionId: z.string(),
  documentPath: DocumentPathSchema,
  data: FirestoreDocumentDataSchema,
  options: FirestoreSaveDocumentOptionsSchema.optional(),
});

export const UpdateDocumentFieldsRequestSchema = z.object({
  connectionId: z.string(),
  documentPath: DocumentPathSchema,
  operations: z.array(FirestoreFieldPatchOperationSchema).min(1),
  options: FirestoreUpdateDocumentFieldsOptionsSchema,
});

export const GenerateDocumentIdRequestSchema = z.object({
  connectionId: z.string(),
  collectionPath: CollectionPathSchema,
});

export const CreateDocumentRequestSchema = z.object({
  connectionId: z.string(),
  collectionPath: CollectionPathSchema,
  documentId: DocumentIdSchema,
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

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index) ?? 0;
    if (codePoint > 0xffff) index += 1;
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}
