import { z } from 'zod';
import { pageOf, PageRequestSchema } from './pagination.ts';

export const AuthUserSchema = z.object({
  uid: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  disabled: z.boolean(),
  customClaims: z.record(z.string(), z.unknown()),
});

export const ListUsersRequestSchema = z.object({
  projectId: z.string(),
  request: PageRequestSchema.optional(),
});

export const SearchUsersRequestSchema = z.object({
  projectId: z.string(),
  query: z.string(),
});

export const AuthUsersPageSchema = pageOf(AuthUserSchema);
