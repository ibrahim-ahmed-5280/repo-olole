import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { ApiError } from '../lib/http';
import type { Logger } from '../config/logger';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
}

/** Converts every error into the standard `{ ok:false, error }` envelope. Stack traces are never sent to clients. */
export function errorHandler(logger: Logger, isProd: boolean) {
   
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const requestId = String((req as { id?: unknown }).id ?? '');
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong. Please try again later.';
    let details: unknown;

    if (err instanceof ApiError) {
      ({ status, code, message, details } = err);
    } else if (err instanceof MulterError) {
      status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      code = 'UPLOAD_REJECTED';
      message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Upload rejected';
    } else if (err instanceof mongoose.Error.CastError) {
      status = 400;
      code = 'INVALID_ID';
      message = 'Invalid identifier';
    } else if (err instanceof mongoose.Error.ValidationError) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = 'The request contains invalid data';
      details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    } else if (typeof err === 'object' && err && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Request body is too large';
    } else if (typeof err === 'object' && err && 'type' in err && (err as { type: string }).type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'Malformed JSON body';
    } else if (typeof err === 'object' && err && (err as { code?: number }).code === 11000) {
      status = 409;
      code = 'CONFLICT';
      message = 'A record with the same unique value already exists';
    }

    if (status >= 500) logger.error({ err, requestId }, 'Unhandled error');
    else logger.debug({ code, status, requestId }, 'Request rejected');

    res.status(status).json({
      ok: false,
      error: { code, message, ...(details ? { details } : {}), ...(requestId ? { requestId } : {}) },
      ...(!isProd && status >= 500 && err instanceof Error ? { debug: err.message } : {}),
    });
  };
}
