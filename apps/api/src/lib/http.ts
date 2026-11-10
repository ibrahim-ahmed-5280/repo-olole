import type { Response } from 'express';
import type { ZodType, ZodTypeDef } from 'zod';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Resource') => new ApiError(404, 'NOT_FOUND', `${what} not found`);
export const forbidden = () => new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action');
export const unauthorized = () => new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');

export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>, status = 200) {
  res.status(status).json(meta ? { ok: true, data, meta } : { ok: true, data });
}

/** Parses untrusted input with a Zod schema, converting failures into a safe 400 response. */
export function parse<O, I = unknown>(schema: ZodType<O, ZodTypeDef, I>, input: unknown): O {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'The request contains invalid data',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}
