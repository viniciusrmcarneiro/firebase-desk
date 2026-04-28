import { z } from 'zod';

export const SCRIPT_RUN_EVENT_CHANNEL = 'scriptRunner.event';

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

export const ScriptRunErrorSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  message: z.string(),
  stack: z.string().optional(),
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
  errors: z.array(ScriptRunErrorSchema),
  durationMs: z.number(),
  cancelled: z.boolean().optional(),
});

export const ScriptRunEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('output'),
    runId: z.string(),
    item: ScriptStreamItemSchema,
  }),
  z.object({
    type: z.literal('log'),
    runId: z.string(),
    log: ScriptLogEntrySchema,
  }),
  z.object({
    type: z.literal('error'),
    runId: z.string(),
    error: ScriptRunErrorSchema,
  }),
  z.object({
    type: z.literal('complete'),
    runId: z.string(),
    result: ScriptRunResultSchema,
  }),
]);
