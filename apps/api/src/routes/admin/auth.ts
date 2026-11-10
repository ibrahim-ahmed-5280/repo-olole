import { Router } from 'express';
import { ROLE_PERMISSIONS, changePasswordSchema, loginSchema } from '@reveal/shared';
import type { AppConfig } from '../../config/env';
import type { Limiters } from '../../middleware/rateLimit';
import { CSRF_COOKIE, SESSION_COOKIE, csrfCookieOptions, requireAuth, requireCsrf, sessionCookieOptions } from '../../middleware/auth';
import { ApiError, notFound, ok, parse } from '../../lib/http';
import { Admin, AdminSession } from '../../models/admin';
import { audit } from '../../services/audit';
import {
  createSession,
  findActiveAdminByUsername,
  getDummyHash,
  hashPassword,
  revokeSessions,
  verifyPassword,
} from '../../services/auth';
import { objectIdSchema } from '@reveal/shared';

export function authRouter(config: AppConfig, limiters: Limiters) {
  const r = Router();

  r.post('/login', limiters.login, async (req, res) => {
    const { username, password } = parse(loginSchema, req.body);
    const admin = await findActiveAdminByUsername(username);
    const valid = admin
      ? await verifyPassword(admin.passwordHash, password)
      : (await verifyPassword(await getDummyHash(), password), false);
    if (!admin || !valid || admin.status !== 'active') {
      await audit(null, 'auth.login_failed', 'admin', admin ? String(admin._id) : null, { reason: admin ? (valid ? 'disabled' : 'bad_password') : 'unknown_user' });
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect username or password');
    }
    const { token, csrfToken, expiresAt } = await createSession(admin._id, req.get('user-agent'), { ttlHours: config.SESSION_TTL_HOURS });
    admin.lastLoginAt = new Date();
    await admin.save();
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(config, expiresAt));
    res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions(config, expiresAt));
    req.auth = { adminId: admin._id, username: admin.username, role: admin.role, sessionId: admin._id, csrfHash: '' };
    await audit(req, 'auth.login', 'admin', String(admin._id));
    ok(res, {
      user: { id: String(admin._id), username: admin.username, role: admin.role },
      permissions: ROLE_PERMISSIONS[admin.role],
      csrfToken,
      expiresAt: expiresAt.toISOString(),
    });
  });

  r.use(requireAuth, requireCsrf);

  r.post('/logout', async (req, res) => {
    await AdminSession.updateOne({ _id: req.auth!.sessionId }, { $set: { revokedAt: new Date() } });
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions(config));
    res.clearCookie(CSRF_COOKIE, csrfCookieOptions(config));
    await audit(req, 'auth.logout', 'admin', String(req.auth!.adminId));
    ok(res, { loggedOut: true });
  });

  r.get('/me', async (req, res) => {
    const a = req.auth!;
    ok(res, { user: { id: String(a.adminId), username: a.username, role: a.role }, permissions: ROLE_PERMISSIONS[a.role] });
  });

  r.post('/password', async (req, res) => {
    const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);
    const admin = await Admin.findById(req.auth!.adminId).select('+passwordHash');
    if (!admin) throw notFound('Admin');
    if (!(await verifyPassword(admin.passwordHash, currentPassword))) {
      throw new ApiError(400, 'INVALID_CREDENTIALS', 'Current password is incorrect');
    }
    admin.passwordHash = await hashPassword(newPassword);
    admin.passwordChangedAt = new Date();
    await admin.save();
    const revoked = await revokeSessions(admin._id, req.auth!.sessionId);
    await audit(req, 'auth.password_changed', 'admin', String(admin._id), { otherSessionsRevoked: revoked });
    ok(res, { changed: true, otherSessionsRevoked: revoked });
  });

  r.get('/sessions', async (req, res) => {
    const sessions = await AdminSession.find({ adminId: req.auth!.adminId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .lean();
    ok(
      res,
      sessions.map((s) => ({
        id: String(s._id),
        createdAt: (s as { createdAt?: Date }).createdAt?.toISOString() ?? null,
        lastSeenAt: s.lastSeenAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        userAgent: s.userAgent ?? '',
        current: String(s._id) === String(req.auth!.sessionId),
      })),
    );
  });

  r.delete('/sessions/:id', async (req, res) => {
    const id = parse(objectIdSchema, req.params.id);
    const result = await AdminSession.updateOne({ _id: id, adminId: req.auth!.adminId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    if (result.matchedCount === 0) throw notFound('Session');
    await audit(req, 'auth.session_revoked', 'admin_session', id);
    ok(res, { revoked: true });
  });

  return r;
}
