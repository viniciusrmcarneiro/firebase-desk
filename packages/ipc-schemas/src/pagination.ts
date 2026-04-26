import { z } from 'zod';

export const PaginationCursorSchema = z.object({ token: z.string() });

export const PageRequestSchema = z.object({
  limit: z.number().int().positive().optional(),
  cursor: PaginationCursorSchema.optional(),
});

export function pageOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item).readonly(),
    nextCursor: PaginationCursorSchema.nullable(),
  });
}
