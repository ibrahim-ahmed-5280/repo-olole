import { Schema, model, type InferSchemaType, Types } from 'mongoose';
import { ROLES } from '@reveal/shared';

const adminSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, lowercase: true, maxlength: 32 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'admins' },
);
adminSchema.index({ username: 1 }, { unique: true });
adminSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });

export type AdminDoc = InferSchemaType<typeof adminSchema> & { _id: Types.ObjectId };
export const Admin = model('Admin', adminSchema);

const sessionSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    /** SHA-256 of the random session token; the raw token only ever lives in the HttpOnly cookie. */
    sessionHash: { type: String, required: true },
    /** SHA-256 of the CSRF token bound to this session (double-submit). */
    csrfHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'admin_sessions' },
);
sessionSchema.index({ sessionHash: 1 }, { unique: true });
sessionSchema.index({ adminId: 1, revokedAt: 1 });
// Expired sessions are deleted automatically by MongoDB.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminSession = model('AdminSession', sessionSchema);
