import { z } from 'zod';

export const ProjectTargetSchema = z.enum(['production', 'emulator']);

export const ProjectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  projectId: z.string(),
  target: ProjectTargetSchema,
});

export const ProjectAddInputSchema = ProjectSummarySchema.omit({ id: true }).extend({
  credentialJson: z.string().optional(),
});
