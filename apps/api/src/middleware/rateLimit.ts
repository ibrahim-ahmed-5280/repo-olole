import rateLimit from 'express-rate-limit';
import type { AppConfig } from '../config/env';

export interface RateLimits {
  feedbackPerHour: number;
  eventsPerMinute: number;
  loginPer15Min: number;
  adminPerMinute: number;
  publicPerMinute: number;
}

export const DEFAULT_LIMITS: RateLimits = {
  feedbackPerHour: 10,
  eventsPerMinute: 120,
  loginPer15Min: 10,
  adminPerMinute: 300,
  publicPerMinute: 300,
};

/**
 * In-memory limiters keyed by client IP. IPs are held only in process memory for the window
 * duration and are never written to the database or logs. For multi-instance deployments,
 * put the limiter in Nginx (see docs/DEPLOYMENT.md) or plug a shared store into express-rate-limit.
 */
export function createLimiters(config: AppConfig, limits: RateLimits) {
  const make = (windowMs: number, limit: number, code: string, message: string) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: () => !!config.RATE_LIMIT_DISABLED,
      handler: (_req, res) => res.status(429).json({ ok: false, error: { code, message } }),
    });
  return {
    feedback: make(3_600_000, limits.feedbackPerHour, 'RATE_LIMITED', 'Too many submissions. Please try again later.'),
    events: make(60_000, limits.eventsPerMinute, 'RATE_LIMITED', 'Too many events'),
    login: make(15 * 60_000, limits.loginPer15Min, 'TOO_MANY_ATTEMPTS', 'Too many sign-in attempts. Wait 15 minutes and try again.'),
    admin: make(60_000, limits.adminPerMinute, 'RATE_LIMITED', 'Too many requests'),
    public: make(60_000, limits.publicPerMinute, 'RATE_LIMITED', 'Too many requests'),
  };
}
export type Limiters = ReturnType<typeof createLimiters>;
