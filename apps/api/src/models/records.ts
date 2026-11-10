import { Schema, model } from 'mongoose';
import { ANALYTICS_EVENTS, FEEDBACK_RESPONSES, MODERATION_STATUSES, PILLAR_SLUGS } from '@reveal/shared';

// ───────────── Feedback (anonymous; no IP, no user agent, no identifiers) ─────────────
const feedbackSchema = new Schema(
  {
    pillar: { type: String, enum: PILLAR_SLUGS, required: true },
    pillarId: { type: Schema.Types.ObjectId, ref: 'Pillar', required: true },
    response: { type: String, enum: FEEDBACK_RESPONSES, required: true },
    suggestion: { type: String, maxlength: 1000, default: null },
    moderationStatus: { type: String, enum: MODERATION_STATUSES, default: 'new' },
    reviewNote: { type: String, maxlength: 1000, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: 'feedback' },
);
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ pillar: 1, createdAt: -1 });
feedbackSchema.index({ moderationStatus: 1, createdAt: -1 });
feedbackSchema.index({ suggestion: 'text' });
export const Feedback = model('Feedback', feedbackSchema);

// ───────────── Aggregate analytics counters (one row per day/event/route/pillar/milestone) ─────────────
const analyticsDailySchema = new Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD (UTC)
    eventType: { type: String, enum: [...ANALYTICS_EVENTS, 'session'], required: true },
    route: { type: String, required: true, maxlength: 120 },
    pillar: { type: String, enum: [...PILLAR_SLUGS, null], default: null },
    milestoneId: { type: Schema.Types.ObjectId, default: null },
    target: { type: String, default: null },
    count: { type: Number, default: 0 },
    aggregationMetadata: {
      firstAt: Date,
      lastAt: Date,
    },
  },
  { collection: 'analytics_daily' },
);
analyticsDailySchema.index(
  { date: 1, eventType: 1, route: 1, pillar: 1, milestoneId: 1, target: 1 },
  { unique: true },
);
analyticsDailySchema.index({ eventType: 1, date: 1 });
export const AnalyticsDaily = model('AnalyticsDaily', analyticsDailySchema);

/**
 * Short-lived de-duplication keys. Each key is an HMAC of (daily salt, session token, event)
 * and cannot be linked back to a visitor; rows self-delete after `expiresAt` (TTL index).
 */
const analyticsDedupSchema = new Schema(
  {
    key: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'analytics_dedup', versionKey: false },
);
analyticsDedupSchema.index({ key: 1 }, { unique: true });
analyticsDedupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AnalyticsDedup = model('AnalyticsDedup', analyticsDedupSchema);

// ───────────── Media ─────────────
const mediaSchema = new Schema(
  {
    storageKey: { type: String, required: true },
    originalName: { type: String, maxlength: 200, default: '' },
    mimeType: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
    altText: { type: String, maxlength: 300, default: '' },
    variants: {
      type: [{ storageKey: String, width: Number, format: String, bytes: Number, _id: false }],
      default: [],
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: 'media_assets' },
);
mediaSchema.index({ storageKey: 1 }, { unique: true });
mediaSchema.index({ createdAt: -1 });
export const MediaAsset = model('MediaAsset', mediaSchema);

// ───────────── Audit log ─────────────
const auditSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    actorName: { type: String, default: null },
    action: { type: String, required: true, maxlength: 60 },
    entityType: { type: String, required: true, maxlength: 40 },
    entityId: { type: String, default: null, maxlength: 60 },
    timestamp: { type: Date, default: () => new Date() },
    /** Only non-sensitive metadata (field names, versions, counts) — never passwords, tokens or feedback text. */
    safeMetadata: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: 'audit_logs', minimize: false },
);
auditSchema.index({ timestamp: -1 });
auditSchema.index({ action: 1, timestamp: -1 });
auditSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
export const AuditLog = model('AuditLog', auditSchema);
