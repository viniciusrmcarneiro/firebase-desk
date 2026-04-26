import { z } from 'zod';

export const HealthCheckRequestSchema = z.object({
  ping: z.literal('ping'),
  sentAt: z.string(),
});

export const HealthCheckResponseSchema = z.object({
  pong: z.literal('pong'),
  receivedAt: z.string(),
  appVersion: z.string(),
});
