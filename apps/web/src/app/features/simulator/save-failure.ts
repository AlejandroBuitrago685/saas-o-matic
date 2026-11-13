import { ApiError } from '../../core/api/api-error';
import { fieldMessage, problemMessage } from '../../core/errors/error-messages';

/**
 * Notice of a failed «Guardar simulación» (spec 05 §3.4). The values of the simulator are always kept.
 */
export function saveFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No se ha podido guardar la simulación. Inténtalo de nuevo.';
  if (error.errors.some(({ code }) => code === 'CUSTOMER_NOT_FOUND'))
    return fieldMessage('CUSTOMER_NOT_FOUND');
  if (error.code === 'RATE_LIMITED') return problemMessage(error);
  const suffix = error.reference === null ? '' : ` (Referencia: ${error.reference})`;
  return `No se ha podido guardar la simulación. Inténtalo de nuevo.${suffix}`;
}
