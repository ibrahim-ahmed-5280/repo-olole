import { addDays, dayKey } from '@reveal/shared';
import type { AppConfig } from '../config/env';
import type { Logger } from '../config/logger';
import { AnalyticsDaily, AuditLog, Feedback } from '../models/records';

/** Deletes records older than the configured retention windows. Safe to run repeatedly. */
export async function runRetention(config: AppConfig, now = new Date()) {
  const [feedback, audit, analytics] = await Promise.all([
    Feedback.deleteMany({ createdAt: { $lt: addDays(now, -config.FEEDBACK_RETENTION_DAYS) } }),
    AuditLog.deleteMany({ timestamp: { $lt: addDays(now, -config.AUDIT_RETENTION_DAYS) } }),
    AnalyticsDaily.deleteMany({ date: { $lt: dayKey(addDays(now, -config.ANALYTICS_RETENTION_DAYS)) } }),
  ]);
  return { feedback: feedback.deletedCount, audit: audit.deletedCount, analytics: analytics.deletedCount };
}

export function scheduleRetention(config: AppConfig, logger: Logger) {
  const run = () =>
    runRetention(config)
      .then((r) => logger.info({ retention: r }, 'Retention job completed'))
      .catch((err) => logger.error({ err }, 'Retention job failed'));
  void run();
  const timer = setInterval(run, 12 * 3_600_000);
  timer.unref();
  return () => clearInterval(timer);
}
