import {
  FIRESTORE_ARRAY_FIELD_TYPES,
  FIRESTORE_PRIMITIVE_FIELD_TYPES,
} from '@firebase-desk/repo-contracts';
import { z } from 'zod';

export const HotkeyOverridesSchema = z.record(z.string(), z.string());

export const DataModeSchema = z.enum(['mock', 'live']);

export const ResultTableLayoutSchema = z.object({
  columnOrder: z.array(z.string()),
  columnSizing: z.record(z.string(), z.number().int().nonnegative()),
});

export const ResultTableLayoutsSchema = z.record(z.string(), ResultTableLayoutSchema);

export const FirestorePrimitiveFieldTypeSchema = z.enum(FIRESTORE_PRIMITIVE_FIELD_TYPES);

export const FirestoreFieldTypeSchema = z.union([
  FirestorePrimitiveFieldTypeSchema,
  z.enum(FIRESTORE_ARRAY_FIELD_TYPES),
]);

export const FirestoreFieldCatalogEntrySchema = z.object({
  count: z.number().int().nonnegative(),
  field: z.string(),
  types: z.array(FirestoreFieldTypeSchema),
});

export const FirestoreFieldCatalogsSchema = z.record(
  z.string(),
  z.array(FirestoreFieldCatalogEntrySchema),
);

export const SettingsSnapshotSchema = z.object({
  sidebarWidth: z.number().int().nonnegative(),
  inspectorWidth: z.number().int().nonnegative(),
  theme: z.enum(['system', 'light', 'dark']),
  dataMode: DataModeSchema,
  hotkeyOverrides: HotkeyOverridesSchema,
  resultTableLayouts: ResultTableLayoutsSchema.default({}),
  firestoreFieldCatalogs: FirestoreFieldCatalogsSchema.default({}),
});

export const SettingsPatchSchema = SettingsSnapshotSchema.partial();

export const SettingsFileSchema = z.object({
  version: z.literal(1),
  snapshot: SettingsSnapshotSchema,
});
