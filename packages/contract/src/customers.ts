import {
  COUNTRIES,
  MAX_CONTACT_EMAIL_LENGTH,
  MAX_SEARCH_QUERY_LENGTH,
  MAX_TAX_ID_INPUT_LENGTH,
  MIN_TAX_ID_INPUT_LENGTH,
  normalizeCompanyName,
  PLANS,
  TAX_ID_TYPES,
} from '@saas-o-matic/domain';
import { z } from 'zod';

import { pageOf, paginationQueryShape } from './pagination.js';
import { isoDateTimeSchema, uuidSchema } from './shared.js';

/**
 * Company name normalized with the domain rules (D-34, D-94). A name that does not pass is a schema error (400) with
 * the code the domain chose: TOO_SHORT, TOO_LONG or INVALID_FORMAT (AC-21).
 */
const companyNameSchema = z.string().transform((value, context) => {
  const name = normalizeCompanyName(value);
  if (name.ok) return name.value;
  context.addIssue({ code: 'custom', message: 'Invalid company name', params: { code: name.error } });
  return z.NEVER;
});

/** Body of POST /customers (04-contrato-api §3.2). The tax id is validated by the use case (422), not here. */
export const createCustomerRequestSchema = z.strictObject({
  companyName: companyNameSchema,
  taxId: z.string().min(MIN_TAX_ID_INPUT_LENGTH).max(MAX_TAX_ID_INPUT_LENGTH),
  country: z.enum(COUNTRIES),
  contactEmail: z
    .email()
    .max(MAX_CONTACT_EMAIL_LENGTH)
    .transform((email) => email.toLowerCase()),
  plan: z.enum(PLANS),
});

/** A customer as the API returns it (201 of POST /customers and GET /customers/{id}). */
export const customerSchema = z.object({
  id: uuidSchema,
  companyName: z.string(),
  taxId: z.string(),
  taxIdType: z.enum(TAX_ID_TYPES),
  country: z.enum(COUNTRIES),
  contactEmail: z.string(),
  plan: z.enum(PLANS),
  createdAt: isoDateTimeSchema,
});

/** Item of GET /customers: a summary **without** the email (D-42). */
export const customerSummarySchema = customerSchema.omit({ contactEmail: true });

/** Query of GET /customers (§3.3): `q` is trimmed and has 100 characters at most. */
export const searchCustomersQuerySchema = z.strictObject({
  q: z.string().trim().max(MAX_SEARCH_QUERY_LENGTH).optional(),
  ...paginationQueryShape,
});

export const customerPageSchema = pageOf(customerSummarySchema);

export type CreateCustomerRequest = z.input<typeof createCustomerRequestSchema>;
export type CreateCustomerCommand = z.output<typeof createCustomerRequestSchema>;
export type CustomerResponse = z.output<typeof customerSchema>;
export type CustomerSummary = z.output<typeof customerSummarySchema>;
export type SearchCustomersQuery = z.output<typeof searchCustomersQuerySchema>;
export type CustomerPage = z.output<typeof customerPageSchema>;
