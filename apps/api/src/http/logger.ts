import type { FastifyServerOptions, LogLevel } from 'fastify';

type LoggerOptions = Exclude<FastifyServerOptions['logger'], boolean | undefined>;

export interface LogStream {
  write(line: string): void;
}

export interface LoggerSettings {
  readonly level: LogLevel;
  readonly isDevelopment: boolean;
  /** Tests capture the lines here (AC-54); otherwise standard output. */
  readonly stream?: LogStream | undefined;
}

const PERSONAL_FIELDS = ['contactEmail', 'taxId', 'companyName', 'q'] as const;

/**
 * Safety net: no line should ever carry these fields, but if one does, pino hides them (03-backend §6), at the top
 * level and one level down (`{ taxId }`, `{ customer: { taxId } }`). pino's `*` stands for exactly one key.
 */
export const REDACTED_PATHS: readonly string[] = PERSONAL_FIELDS.flatMap((field) => [field, `*.${field}`]);

/**
 * pino without personal data (RNF-SEC-11): the request and reply serializers keep neither the URL, the query, the
 * headers, the body nor the IP, and an error keeps its type, message, stack and code (the SQLite one included), never
 * other properties. JSON lines everywhere except in development, which uses `pino-pretty`.
 */
export function loggerOptions({ level, isDevelopment, stream }: LoggerSettings): LoggerOptions {
  const base: LoggerOptions = {
    level,
    redact: { paths: [...REDACTED_PATHS], censor: '[redacted]' },
    serializers: {
      req: (request) => ({ method: request.method }),
      res: (reply) => ({ statusCode: reply.statusCode }),
      err: (error) => ({
        type: error.name,
        message: error.message,
        stack: error.stack ?? '',
        code: error.code,
      }),
    },
  };
  if (stream !== undefined) return { ...base, stream };
  return isDevelopment ? { ...base, transport: { target: 'pino-pretty' } } : base;
}
