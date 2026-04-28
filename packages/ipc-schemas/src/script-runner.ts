import { z } from 'zod';

export const ScriptLogLevelSchema = z.enum(['log', 'info', 'warn', 'error']);

export const ScriptLogEntrySchema = z.object({
  level: ScriptLogLevelSchema,
  message: z.string(),
  timestamp: z.string(),
});

export const ScriptStreamItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  badge: z.string(),
  view: z.enum(['json', 'table']),
  value: z.unknown(),
});

export const ScriptRunRequestSchema = z.object({
  runId: z.string(),
  connectionId: z.string(),
  source: z.string(),
});

export const ScriptRunResultSchema = z.object({
  returnValue: z.unknown(),
  stream: z.array(ScriptStreamItemSchema).optional(),
  logs: z.array(ScriptLogEntrySchema),
  errors: z.array(z.object({
    name: z.string().optional(),
    code: z.string().optional(),
    message: z.string(),
    stack: z.string().optional(),
  })),
  durationMs: z.number(),
  cancelled: z.boolean().optional(),
});
