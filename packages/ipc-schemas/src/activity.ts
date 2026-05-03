import {
  ACTIVITY_LOG_AREAS,
  ACTIVITY_LOG_DETAIL_MODES,
  ACTIVITY_LOG_STATUSES,
} from '@firebase-desk/repo-contracts';
import { z } from 'zod';

export const ActivityLogAreaSchema = z.enum(ACTIVITY_LOG_AREAS);
export const ActivityLogStatusSchema = z.enum(ACTIVITY_LOG_STATUSES);
export const ActivityLogDetailModeSchema = z.enum(ACTIVITY_LOG_DETAIL_MODES);

export const ActivityLogSettingsSchema = z.object({
  detailMode: ActivityLogDetailModeSchema,
  enabled: z.boolean(),
  maxBytes: z.number().int().min(1024).max(100 * 1024 * 1024),
});

export const ActivityLogTargetSchema = z.object({
  connectionId: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  type: z.enum([
    'auth-user',
    'firestore-collection',
    'firestore-document',
    'firestore-query',
    'project',
    'script',
    'settings',
    'workspace',
  ]),
  uid: z.string().min(1).optional(),
});

export const ActivityLogErrorSchema = z.object({
  message: z.string().min(1),
  name: z.string().min(1).optional(),
});

const RecordSchema = z.record(z.string(), z.unknown());

export const ActivityLogEntrySchema = z.object({
  action: z.string().min(1),
  area: ActivityLogAreaSchema,
  durationMs: z.number().finite().nonnegative().optional(),
  error: ActivityLogErrorSchema.optional(),
  id: z.string().min(1),
  metadata: RecordSchema.optional(),
  payload: RecordSchema.optional(),
  status: ActivityLogStatusSchema,
  summary: z.string().min(1),
  target: ActivityLogTargetSchema.optional(),
  timestamp: z.string().datetime(),
});

export const ActivityLogAppendInputSchema = ActivityLogEntrySchema.omit({
  id: true,
  timestamp: true,
});

export const ActivityLogListRequestSchema = z.object({
  area: z.union([ActivityLogAreaSchema, z.literal('all')]).optional(),
  limit: z.number().int().positive().max(1000).optional(),
  search: z.string().optional(),
  status: z.union([ActivityLogStatusSchema, z.literal('all')]).optional(),
}).optional();

export const ActivityLogExportResultSchema = z.object({
  canceled: z.boolean(),
  filePath: z.string().optional(),
});
