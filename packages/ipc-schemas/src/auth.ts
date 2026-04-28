import { z } from 'zod';
import { pageOf, PageRequestSchema } from './pagination.ts';

export const AuthUserSchema = z.object({
  uid: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  provider: z.string(),
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

export const SetCustomClaimsRequestSchema = z.object({
  projectId: z.string(),
  uid: z.string(),
  claims: z.record(z.string(), z.unknown()),
});

export const AuthUsersPageSchema = pageOf(AuthUserSchema);
