import { z } from 'zod';

// Building blocks of the contract (04-contrato-api §1). Requests use strict objects (unknown fields → 400); responses
// use plain objects, so anything not declared is left out of the serialized body (03-backend §2.1).

/** UUID in its canonical form (RFC 9562); the API only creates v7 (D-41). */
export const uuidSchema = z.uuid();

/** ISO 8601 in UTC with milliseconds: `2026-11-12T10:00:00.000Z`. */
export const isoDateTimeSchema = z.iso.datetime({ precision: 3 });

/** Integer amount in EUR cents. */
export const centsSchema = z.number().int().min(0);

/** A strict object with no fields: any query parameter → 400 UNKNOWN_FIELD (GET /catalog, GET /stats). */
export const noQuerySchema = z.strictObject({});

/** Path parameter `{id}`: not a UUID → 400 INVALID_FORMAT with location `path`. */
export const idParamsSchema = z.strictObject({ id: uuidSchema });
