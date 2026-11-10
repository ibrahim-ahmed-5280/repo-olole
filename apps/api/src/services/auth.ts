import crypto from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import type { Types } from 'mongoose';
import { Admin, AdminSession } from '../models/admin';

/** Argon2id parameters (OWASP 2024 minimum profile: m=19 MiB, t=2, p=1). Algorithm 2 = Argon2id. */
const ARGON2_OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS as never);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// A real Argon2id hash used to equalise timing when a username does not exist.
let dummyHash: Promise<string> | null = null;
export function getDummyHash() {
  dummyHash ??= hashPassword(crypto.randomBytes(16).toString('hex'));
  return dummyHash;
}

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export interface SessionOptions {
  ttlHours: number;
}

export async function createSession(adminId: Types.ObjectId, userAgent: string | undefined, opts: SessionOptions) {
  const token = randomToken();
  const csrfToken = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + opts.ttlHours * 3_600_000);
  const session = await AdminSession.create({
    adminId,
    sessionHash: sha256(token),
    csrfHash: sha256(csrfToken),
    expiresAt,
    lastSeenAt: now,
    userAgent: userAgent?.slice(0, 200),
  });
  return { token, csrfToken, expiresAt, session };
}

export async function revokeSessions(adminId: Types.ObjectId, exceptSessionId?: Types.ObjectId) {
  const filter: Record<string, unknown> = { adminId, revokedAt: null };
  if (exceptSessionId) filter._id = { $ne: exceptSessionId };
  const r = await AdminSession.updateMany(filter, { $set: { revokedAt: new Date() } });
  return r.modifiedCount;
}

export async function findActiveAdminByUsername(username: string) {
  return Admin.findOne({ username: username.toLowerCase() }).select('+passwordHash');
}
