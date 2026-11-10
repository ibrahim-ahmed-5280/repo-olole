import pino from 'pino';

/**
 * Structured JSON logger. Request logs deliberately omit IP addresses, cookies, auth headers
 * and bodies (see docs/SECURITY.md → "Logging").
 */
export function createLogger(level: string) {
  return pino({
    level,
    base: { service: 'reveal-api' },
    redact: {
      paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-csrf-token"]', 'res.headers["set-cookie"]', '*.password', '*.passwordHash'],
      remove: true,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type Logger = ReturnType<typeof createLogger>;
