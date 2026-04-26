import { z } from 'zod';

export const ScriptLogLevelSchema = z.enum(['log', 'info', 'warn', 'error']);

export const ScriptLogEntrySchema = z.object({
  level: ScriptLogLevelSchema,
  message: z.string(),
  timestamp: z.string(),
});

export const ScriptRunRequestSchema = z.object({
  projectId: z.string(),
  source: z.string(),
  timeoutMs: z.number().int().positive().optional(),
});

export const ScriptRunResultSchema = z.object({
  returnValue: z.unknown(),
  logs: z.array(ScriptLogEntrySchema),
  errors: z.array(z.object({ message: z.string(), stack: z.string().optional() })),
  durationMs: z.number(),
});
