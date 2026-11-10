import type { NextFunction, Request, Response } from 'express';
import { hasPermission, type Permission } from '@reveal/shared';
import type { AppConfig } from '../config/env';
import { Admin, AdminSession } from '../models/admin';
import { ApiError, forbidden, unauthorized } from '../lib/http';
import { safeEqual, sha256 } from '../services/auth';

export const SESSION_COOKIE = 'reveal_sid';
export const CSRF_COOKIE = 'reveal_csrf';

export function sessionCookieOptions(config: AppConfig, expires?: Date) {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'strict' as const,
    path: '/api',
    ...(expires ? { expires } : {}),
  };
}

export function csrfCookieOptions(config: AppConfig, expires?: Date) {
  return {
    httpOnly: false, // must be readable by the admin SPA to echo in the X-CSRF-Token header
    secure: config.COOKIE_SECURE,
    sameSite: 'strict' as const,
    path: '/',
    ...(expires ? { expires } : {}),
  };
}

/** Loads the admin session (if any) from the HttpOnly cookie. Never throws for anonymous requests. */
export function loadSession(config: AppConfig) {
  const idleMs = config.SESSION_IDLE_MINUTES * 60_000;
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) return next();
    const now = new Date();
    const session = await AdminSession.findOne({ sessionHash: sha256(token), revokedAt: null, expiresAt: { $gt: now } });
    if (!session) {
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions(config));
      return next();
    }
    if (now.getTime() - session.lastSeenAt.getTime() > idleMs) {
      session.revokedAt = now;
      await session.save();
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions(config));
      return next();
    }
    const admin = await Admin.findById(session.adminId).lean();
    if (!admin || admin.status !== 'active') return next();
    // Throttle "last seen" writes to once per minute.
    if (now.getTime() - session.lastSeenAt.getTime() > 60_000) {
      await AdminSession.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } });
    }
    req.auth = {
      adminId: admin._id,
      username: admin.username,
      role: admin.role,
      sessionId: session._id,
      csrfHash: session.csrfHash,
    };
    next();
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());
  next();
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!permissions.every((p) => hasPermission(req.auth!.role, p))) return next(forbidden());
    next();
  };
}

/** Same as requirePermission but passes when ANY of the permissions is held. */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!permissions.some((p) => hasPermission(req.auth!.role, p))) return next(forbidden());
    next();
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Double-submit CSRF check for authenticated, state-changing requests. */
export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || !req.auth) return next();
  const header = req.get('x-csrf-token');
  if (!header || header.length > 100 || !safeEqual(sha256(header), req.auth.csrfHash)) {
    return next(new ApiError(403, 'CSRF_FAILED', 'Security token missing or invalid. Reload the page and try again.'));
  }
  next();
}

/** Rejects cross-origin state-changing requests from origins outside the allowlist. */
export function originGuard(config: AppConfig) {
  const allowed = new Set(config.allowedOrigins);
  return (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !allowed.has(origin.replace(/\/$/, ''))) {
      return next(new ApiError(403, 'ORIGIN_REJECTED', 'Request origin is not allowed'));
    }
    next();
  };
}
