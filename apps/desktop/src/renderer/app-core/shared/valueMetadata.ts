import type { FirestoreFieldPatchOperation } from '@firebase-desk/repo-contracts';

export function documentDataMetadata(data: Record<string, unknown>): Record<string, unknown> {
  return {
    fieldCount: Object.keys(data).length,
    fields: Object.fromEntries(
      Object.entries(data).map(([field, value]) => [field, valueKind(value)]),
    ),
  };
}

export function fieldPatchMetadata(
  operations: ReadonlyArray<FirestoreFieldPatchOperation>,
): Record<string, unknown> {
  return {
    operationCount: operations.length,
    operations: operations.map((operation) => ({
      fieldPath: operation.fieldPath,
      type: operation.type,
      ...(operation.type === 'set' ? { valueType: valueKind(operation.value) } : {}),
    })),
    writeMode: 'field-patch',
  };
}

export function valueKind(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') {
    const type = (value as { readonly __type__?: unknown; }).__type__;
    return typeof type === 'string' ? type : 'map';
  }
  return typeof value;
}
