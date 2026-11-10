import { Router, type Request } from 'express';
import { Types } from 'mongoose';
import {
  PILLAR_SLUGS,
  candidateUpdateSchema,
  hasPermission,
  milestoneInputSchema,
  milestoneUpdateSchema,
  normalizeOrder,
  objectIdSchema,
  pillarSlugSchema,
  pillarUpdateSchema,
  reorderSchema,
  versionsQuerySchema,
  type ContentEntityType,
} from '@reveal/shared';
import { requirePermission } from '../../middleware/auth';
import { ApiError, forbidden, notFound, ok, parse } from '../../lib/http';
import { ContentVersion, Milestone, Pillar } from '../../models/content';
import { MediaAsset } from '../../models/records';
import { audit } from '../../services/audit';
import {
  buildCandidateDTO,
  buildRoadmapDTO,
  getCandidateDoc,
  getPillarDoc,
  listMilestones,
  publish,
  publishState,
  restoreVersion,
  touchDraft,
  unpublish,
} from '../../services/content';

const toId = <T extends { _id: unknown }>(doc: T) => {
  const { _id, __v, ...rest } = doc as T & { __v?: unknown };
  void __v;
  return { id: String(_id), ...rest };
};

async function assertAssetsExist(ids: Array<string | null | undefined>) {
  const wanted = ids.filter((x): x is string => !!x);
  if (!wanted.length) return;
  const count = await MediaAsset.countDocuments({ _id: { $in: wanted } });
  if (count !== new Set(wanted).size) throw new ApiError(400, 'UNKNOWN_MEDIA', 'Referenced media asset does not exist');
}

export function contentRouter() {
  const r = Router();
  const read = requirePermission('content:read');
  const write = requirePermission('content:write');
  const pub = requirePermission('content:publish');
  const request = requirePermission('content:request_publish');

  // ───────────── Candidate ─────────────
  r.get('/candidate', read, async (_req, res) => {
    const doc = await getCandidateDoc();
    const raw = doc.toObject();
    ok(res, { draft: toId(raw), preview: await buildCandidateDTO(doc), state: publishState(doc) });
  });

  r.patch('/candidate', write, async (req, res) => {
    const input = parse(candidateUpdateSchema, req.body);
    await assertAssetsExist([input.portraitAssetId, input.pose?.assetId]);
    const doc = await getCandidateDoc();
    doc.set(input);
    doc.draftUpdatedAt = new Date();
    await doc.save();
    await audit(req, 'content.draft_saved', 'candidate', 'main', { fields: Object.keys(input) });
    ok(res, { draft: toId(doc.toObject()), preview: await buildCandidateDTO(doc), state: publishState(doc) });
  });

  r.post('/candidate/publish', pub, async (req, res) => {
    const result = await publish('candidate', 'main', req.auth!.adminId, String(req.body?.note ?? '').slice(0, 300));
    await audit(req, 'content.published', 'candidate', 'main', { version: result.version });
    ok(res, result);
  });

  r.post('/candidate/request-review', request, async (req, res) => {
    const doc = await getCandidateDoc();
    doc.set({ reviewRequestedAt: new Date(), reviewRequestedBy: req.auth!.adminId });
    await doc.save();
    await audit(req, 'content.review_requested', 'candidate', 'main');
    ok(res, { requested: true });
  });

  r.get('/preview/candidate', read, async (_req, res) => {
    ok(res, await buildCandidateDTO(await getCandidateDoc()));
  });

  // ───────────── Pillars & roadmaps ─────────────
  r.get('/pillars', read, async (_req, res) => {
    const list = await Promise.all(
      PILLAR_SLUGS.map(async (slug) => {
        const p = await getPillarDoc(slug);
        const ms = await listMilestones(p._id);
        return {
          ...toId(p.toObject()),
          milestoneCount: ms.length,
          activeMilestoneCount: ms.filter((m) => m.status === 'active').length,
          exampleCount: ms.filter((m) => m.isExample).length,
          state: publishState(p),
        };
      }),
    );
    ok(res, list.sort((a, b) => a.order - b.order));
  });

  r.get('/pillars/:slug', read, async (req, res) => {
    const p = await getPillarDoc(parse(pillarSlugSchema, req.params.slug));
    const milestones = (await listMilestones(p._id)).map((m) => toId(m));
    ok(res, { pillar: toId(p.toObject()), milestones, state: publishState(p) });
  });

  r.patch('/pillars/:slug', write, async (req, res) => {
    const slug = parse(pillarSlugSchema, req.params.slug);
    const input = parse(pillarUpdateSchema, req.body);
    const p = await getPillarDoc(slug);
    p.set(input);
    p.draftUpdatedAt = new Date();
    await p.save();
    await audit(req, 'content.draft_saved', 'pillar', slug, { fields: Object.keys(input) });
    ok(res, { pillar: toId(p.toObject()), state: publishState(p) });
  });

  r.post('/pillars/:slug/publish', pub, async (req, res) => {
    const slug = parse(pillarSlugSchema, req.params.slug);
    const result = await publish('pillar', slug, req.auth!.adminId, String(req.body?.note ?? '').slice(0, 300));
    await audit(req, 'content.published', 'pillar', slug, { version: result.version });
    ok(res, result);
  });

  r.post('/pillars/:slug/unpublish', pub, async (req, res) => {
    const slug = parse(pillarSlugSchema, req.params.slug);
    await unpublish('pillar', slug);
    await audit(req, 'content.unpublished', 'pillar', slug);
    ok(res, { unpublished: true });
  });

  r.post('/pillars/:slug/request-review', request, async (req, res) => {
    const slug = parse(pillarSlugSchema, req.params.slug);
    const p = await getPillarDoc(slug);
    p.set({ reviewRequestedAt: new Date(), reviewRequestedBy: req.auth!.adminId });
    await p.save();
    await audit(req, 'content.review_requested', 'pillar', slug);
    ok(res, { requested: true });
  });

  r.put('/pillars/:slug/milestone-order', write, async (req, res) => {
    const slug = parse(pillarSlugSchema, req.params.slug);
    const { ids } = parse(reorderSchema, req.body);
    const p = await getPillarDoc(slug);
    const current = await Milestone.find({ pillarId: p._id }).select('_id').lean();
    let order;
    try {
      order = normalizeOrder(current.map((m) => String(m._id)), ids);
    } catch (e) {
      throw new ApiError(400, 'INVALID_ORDER', (e as Error).message);
    }
    await Milestone.bulkWrite(order.map((o) => ({ updateOne: { filter: { _id: new Types.ObjectId(o.id) }, update: { $set: { order: o.order } } } })));
    await touchDraft('pillar', slug);
    await audit(req, 'content.milestones_reordered', 'pillar', slug, { count: ids.length });
    ok(res, { reordered: true });
  });

  r.get('/preview/pillars/:slug', read, async (req, res) => {
    const p = await getPillarDoc(parse(pillarSlugSchema, req.params.slug));
    const { hiddenMilestones: _h, ...dto } = await buildRoadmapDTO(p);
    ok(res, dto);
  });

  // ───────────── Milestones ─────────────
  r.post('/milestones', write, async (req, res) => {
    const input = parse(milestoneInputSchema, req.body);
    await assertAssetsExist([input.illustrationAssetId]);
    const p = await getPillarDoc(input.pillar);
    const last = await Milestone.findOne({ pillarId: p._id }).sort({ order: -1 }).select('order').lean();
    const { pillar: _pillar, ...fields } = input;
    const m = await Milestone.create({ ...fields, pillarId: p._id, order: (last?.order ?? 0) + 1 });
    await touchDraft('pillar', input.pillar);
    await audit(req, 'content.milestone_created', 'milestone', String(m._id), { pillar: input.pillar });
    ok(res, toId(m.toObject()), undefined, 201);
  });

  async function milestoneWithPillar(id: string) {
    const m = await Milestone.findById(parse(objectIdSchema, id));
    if (!m) throw notFound('Milestone');
    const slug = (await Pillar.findById(m.pillarId).select('slug').lean())?.slug;
    return { m, slug: slug as (typeof PILLAR_SLUGS)[number] };
  }

  r.patch('/milestones/:id', write, async (req, res) => {
    const input = parse(milestoneUpdateSchema, req.body);
    await assertAssetsExist([input.illustrationAssetId]);
    const { m, slug } = await milestoneWithPillar(String(req.params.id));
    m.set(input);
    await m.save();
    await touchDraft('pillar', slug);
    await audit(req, 'content.milestone_updated', 'milestone', String(m._id), { fields: Object.keys(input) });
    ok(res, toId(m.toObject()));
  });

  r.delete('/milestones/:id', write, async (req, res) => {
    const { m, slug } = await milestoneWithPillar(String(req.params.id));
    await m.deleteOne();
    await touchDraft('pillar', slug);
    await audit(req, 'content.milestone_deleted', 'milestone', String(m._id), { pillar: slug, title: m.title.slice(0, 80) });
    ok(res, { deleted: true });
  });

  // ───────────── Version history ─────────────
  r.get('/versions', async (req, res) => {
    const q = parse(versionsQuerySchema, req.query);
    if (!canTouch(req, q.entityType, 'read')) throw forbidden();
    const versions = await ContentVersion.find({ entityType: q.entityType, entityId: q.entityId })
      .sort({ version: -1 })
      .limit(50)
      .select('-snapshot')
      .populate('publishedBy', 'username')
      .lean();
    ok(
      res,
      versions.map((v) => ({
        id: String(v._id),
        version: v.version,
        publishedAt: v.publishedAt.toISOString(),
        publishedBy: (v.publishedBy as unknown as { username?: string } | null)?.username ?? 'unknown',
        note: v.note,
      })),
    );
  });

  r.post('/versions/:id/restore', async (req, res) => {
    const id = parse(objectIdSchema, req.params.id);
    const v = await ContentVersion.findById(id).select('entityType entityId').lean();
    if (!v) throw notFound('Version');
    if (!canTouch(req, v.entityType as ContentEntityType, 'write')) throw forbidden();
    const result = await restoreVersion(id);
    await audit(req, 'content.version_restored', v.entityType, v.entityId, { version: result.version });
    ok(res, result);
  });

  return r;
}

function canTouch(req: Request, entityType: ContentEntityType, mode: 'read' | 'write') {
  const role = req.auth?.role;
  if (entityType === 'settings') return hasPermission(role, 'settings:write');
  return hasPermission(role, mode === 'read' ? 'content:read' : 'content:write');
}
