import { z } from 'zod';

export const ProjectTargetSchema = z.enum(['production', 'emulator']);

export const EmulatorConnectionProfileSchema = z.object({
  firestoreHost: z.string(),
  authHost: z.string(),
});

export const ProjectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  projectId: z.string(),
  target: ProjectTargetSchema,
  emulator: EmulatorConnectionProfileSchema.optional(),
  hasCredential: z.boolean(),
  credentialEncrypted: z.boolean().nullable(),
  createdAt: z.string(),
});

export const ProjectAddInputSchema = z.object({
  name: z.string(),
  projectId: z.string(),
  target: ProjectTargetSchema,
  emulator: EmulatorConnectionProfileSchema.optional(),
  credentialJson: z.string().optional(),
});

export const ProjectUpdatePatchSchema = z.object({
  name: z.string().optional(),
  projectId: z.string().optional(),
  emulator: EmulatorConnectionProfileSchema.optional(),
});

export const ServiceAccountSummarySchema = z.object({
  type: z.literal('service_account'),
  projectId: z.string(),
  clientEmail: z.string(),
});

export const ServiceAccountValidationResultSchema = z.object({
  ok: z.boolean(),
  summary: ServiceAccountSummarySchema.optional(),
  errors: z.array(z.string()).optional(),
});

export const PickServiceAccountFileResultSchema = z.object({
  canceled: z.boolean(),
  json: z.string().optional(),
});
