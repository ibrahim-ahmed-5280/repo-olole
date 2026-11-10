import { Router } from 'express';
import {
  PILLAR_SLUGS,
  auditQuerySchema,
  createAdminSchema,
  hasPermission,
  objectIdSchema,
  resolveDateRange,
  settingsUpdateSchema,
  updateAdminSchema,
} from '@reveal/shared';
import { requirePermission } from '../../middleware/auth';
import { ApiError, notFound, ok, parse } from '../../lib/http';
import { Admin } from '../../models/admin';
import { AuditLog, Feedback } from '../../models/records';
import { audit } from '../../services/audit';
import { hashPassword, revokeSessions } from '../../services/auth';
import { analyticsSummary } from '../../services/analytics';
import { buildSettingsDTO, getCandidateDoc, getPillarDoc, getSettingsDoc, publish, publishState } from '../../services/content';

const adminDTO = (a: { _id: unknown; username: string; email?: string | null; role: string; status: string; createdAt?: Date; lastLoginAt?: Date | null }) => ({
  id: String(a._id),
  username: a.username,
  email: a.email ?? undefined,
  role: a.role,
  status: a.status,
  createdAt: a.createdAt?.toISOString() ?? null,
  lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
});

export function systemRouter() {
  const r = Router();

  // ───────────── Dashboard overview (sections depend on role) ─────────────
  r.get('/dashboard', async (req, res) => {
    const role = req.auth!.role;
    const data: Record<string, unknown> = { role };
    if (hasPermission(role, 'analytics:read')) {
      const s = await analyticsSummary(resolveDateRange({}, new Date(), 14));
      data.analytics = { range: s.range, totals: s.totals, daily: s.daily, roadmaps: s.roadmaps, feedback: s.feedback, methodology: s.methodology };
    }
    if (hasPermission(role, 'feedback:read')) {
      const [recent, newCount, total] = await Promise.all([
        Feedback.find({ moderationStatus: { $ne: 'hidden' } }).sort({ createdAt: -1 }).limit(5).lean(),
        Feedback.countDocuments({ moderationStatus: 'new' }),
        Feedback.countDocuments(),
      ]);
      data.feedback = {
        newCount,
        total,
        recent: recent.map((f) => ({ id: String(f._id), pillar: f.pillar, response: f.response, suggestion: f.suggestion, createdAt: f.createdAt.toISOString() })),
      };
    }
    if (hasPermission(role, 'content:read')) {
      const candidate = await getCandidateDoc();
      const pillars = await Promise.all(PILLAR_SLUGS.map(async (slug) => ({ slug, name: (await getPillarDoc(slug)).name, state: publishState(await getPillarDoc(slug)) })));
      data.content = { candidate: publishState(candidate), pillars };
    }
    ok(res, data);
  });

  // ───────────── Website settings ─────────────
  r.get('/settings', requirePermission('settings:write'), async (_req, res) => {
    const doc = await getSettingsDoc();
    ok(res, { draft: buildSettingsDTO(doc), state: publishState(doc) });
  });

  r.patch('/settings', requirePermission('settings:write'), async (req, res) => {
    const input = parse(settingsUpdateSchema, req.body);
    const doc = await getSettingsDoc();
    doc.set(input);
    doc.draftUpdatedAt = new Date();
    await doc.save();
    await audit(req, 'settings.draft_saved', 'settings', 'main', { fields: Object.keys(input) });
    ok(res, { draft: buildSettingsDTO(doc), state: publishState(doc) });
  });

  r.post('/settings/publish', requirePermission('settings:write'), async (req, res) => {
    const result = await publish('settings', 'main', req.auth!.adminId);
    await audit(req, 'settings.published', 'settings', 'main', { version: result.version });
    ok(res, result);
  });

  // ───────────── Admin user management (owner) ─────────────
  r.get('/users', requirePermission('users:manage'), async (_req, res) => {
    const users = await Admin.find().sort({ createdAt: 1 }).lean();
    ok(res, users.map(adminDTO));
  });

  r.post('/users', requirePermission('users:manage'), async (req, res) => {
    const input = parse(createAdminSchema, req.body);
    const admin = await Admin.create({ username: input.username, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) });
    await audit(req, 'users.created', 'admin', String(admin._id), { role: input.role });
    ok(res, adminDTO(admin.toObject()), undefined, 201);
  });

  r.patch('/users/:id', requirePermission('users:manage'), async (req, res) => {
    const id = parse(objectIdSchema, req.params.id);
    const input = parse(updateAdminSchema, req.body);
    const admin = await Admin.findById(id);
    if (!admin) throw notFound('Admin');
    if (String(admin._id) === String(req.auth!.adminId) && (input.role && input.role !== 'owner' || input.status === 'disabled')) {
      throw new ApiError(400, 'SELF_LOCKOUT', 'You cannot demote or disable your own account');
    }
    const demotingOwner = admin.role === 'owner' && ((input.role && input.role !== 'owner') || input.status === 'disabled');
    if (demotingOwner && (await Admin.countDocuments({ role: 'owner', status: 'active' })) <= 1) {
      throw new ApiError(400, 'LAST_OWNER', 'At least one active owner is required');
    }
    admin.set(input);
    await admin.save();
    if (input.status === 'disabled' || input.role) await revokeSessions(admin._id);
    await audit(req, 'users.updated', 'admin', id, { ...input });
    ok(res, adminDTO(admin.toObject()));
  });

  r.post('/users/:id/revoke-sessions', requirePermission('users:manage'), async (req, res) => {
    const id = parse(objectIdSchema, req.params.id);
    const admin = await Admin.findById(id).lean();
    if (!admin) throw notFound('Admin');
    const count = await revokeSessions(admin._id);
    await audit(req, 'users.sessions_revoked', 'admin', id, { count });
    ok(res, { revoked: count });
  });

  // ───────────── Audit logs ─────────────
  r.get('/audit-logs', requirePermission('audit:read'), async (req, res) => {
    const q = parse(auditQuerySchema, req.query);
    const filter: Record<string, unknown> = {};
    if (q.action) filter.action = q.action;
    if (q.entityType) filter.entityType = q.entityType;
    if (q.from || q.to) {
      const range = resolveDateRange({ from: q.from, to: q.to }, new Date(), 3650, 3650);
      filter.timestamp = { $gte: range.start, $lt: range.endExclusive };
    }
    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(),
      AuditLog.countDocuments(filter),
    ]);
    ok(
      res,
      items.map((a) => ({
        id: String(a._id),
        actor: a.actorName ?? 'system',
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        timestamp: a.timestamp.toISOString(),
        metadata: a.safeMetadata,
      })),
      { page: q.page, pageSize: q.pageSize, total },
    );
  });

  return r;
}
