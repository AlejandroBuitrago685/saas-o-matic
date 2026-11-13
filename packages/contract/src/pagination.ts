import { DEFAULT_PAGE_SIZE, MAX_PAGE_OFFSET, MAX_PAGE_SIZE } from '@saas-o-matic/domain';
import { z } from 'zod';

/** `limit` and `offset` of every list (04-contrato-api §1.1). Query values arrive as text and are coerced. */
export const paginationQueryShape = {
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).max(MAX_PAGE_OFFSET).default(0),
};

export const paginationQuerySchema = z.strictObject(paginationQueryShape);

export const pageSchema = z.object({
  limit: z.number().int(),
  offset: z.number().int(),
  total: z.number().int().min(0),
});

/** `{ items, page }` of a list of the given item. */
export function pageOf<T extends z.ZodType>(
  item: T,
): z.ZodObject<{ items: z.ZodArray<T>; page: typeof pageSchema }> {
  return z.object({ items: z.array(item), page: pageSchema });
}

export type PaginationQuery = z.output<typeof paginationQuerySchema>;
export type Page = z.output<typeof pageSchema>;
