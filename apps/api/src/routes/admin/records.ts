import { Router } from 'express';
import multer from 'multer';
import {
  dateRangeQuerySchema,
  feedbackModerationSchema,
  feedbackQuerySchema,
  mediaUpdateSchema,
  objectIdSchema,
  resolveDateRange,
  toCsv,
  type FeedbackDTO,
} from '@reveal/shared';
import type { AppConfig } from '../../config/env';
import { requireAnyPermission, requirePermission } from '../../middleware/auth';
import { ApiError, notFound, ok, parse } from '../../lib/http';
import { Feedback, MediaAsset } from '../../models/records';
import { CandidateProfile, ContentVersion, Milestone } from '../../models/content';
import { audit } from '../../services/audit';
import { analyticsSummary } from '../../services/analytics';
import { deleteImageFiles, storeImage, toMediaDTO } from '../../services/media';

function feedbackFilter(q: ReturnType<typeof feedbackQuerySchema.parse>) {
  const filter: Record<string, unknown> = {};
  if (q.pillar) filter.pillar = q.pillar;
  if (q.response) filter.response = q.response;
  if (q.status) filter.moderationStatus = q.status;
  if (q.from || q.to) {
    const range = resolveDateRange({ from: q.from, to: q.to }, new Date(), 3650, 3650);
    filter.createdAt = { $gte: range.start, $lt: range.endExclusive };
  }
  if (q.q) {
    // Escaped substring search (no user-controlled regex).
    const escaped = q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.suggestion = { $regex: escaped, $options: 'i' };
  }
  return filter;
}

const toFeedbackDTO = (f: {
  _id: unknown;
  pillar: string;
  response: string;
  suggestion?: string | null;
  moderationStatus: string;
  reviewNote?: string | null;
  createdAt: Date;
}): FeedbackDTO => ({
  id: String(f._id),
  pillar: f.pillar as FeedbackDTO['pillar'],
  response: f.response as FeedbackDTO['response'],
  suggestion: f.suggestion ?? null,
  moderationStatus: f.moderationStatus as FeedbackDTO['moderationStatus'],
  reviewNote: f.reviewNote ?? null,
  createdAt: f.createdAt.toISOString(),
});

export function recordsRouter(config: AppConfig) {
  const r = Router();

  // ───────────── Feedback inbox ─────────────
  r.get('/feedback', requirePermission('feedback:read'), async (req, res) => {
    const q = parse(feedbackQuerySchema, req.query);
    const filter = feedbackFilter(q);
    const [items, total] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(),
      Feedback.countDocuments(filter),
    ]);
    ok(res, items.map(toFeedbackDTO), { page: q.page, pageSize: q.pageSize, total });
  });

  r.get('/feedback/export.csv', requirePermission('feedback:export'), async (req, res) => {
    const q = parse(feedbackQuerySchema, req.query);
    const items = await Feedback.find(feedbackFilter(q)).sort({ createdAt: -1 }).limit(20_000).lean();
    const csv = toCsv(
      ['id', 'roadmap', 'response', 'suggestion', 'moderation_status', 'submitted_at_utc'],
      items.map((f) => [String(f._id), f.pillar, f.response, f.moderationStatus === 'hidden' ? '[hidden]' : f.suggestion ?? '', f.moderationStatus, f.createdAt.toISOString()]),
    );
    await audit(req, 'feedback.exported', 'feedback', null, { rows: items.length });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="feedback-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.set('Cache-Control', 'no-store');
    res.send('﻿' + csv);
  });

  r.patch('/feedback/:id', requirePermission('feedback:moderate'), async (req, res) => {
    const id = parse(objectIdSchema, req.params.id);
    const input = parse(feedbackModerationSchema, req.body);
    const f = await Feedback.findById(id);
    if (!f) throw notFound('Feedback');
    if (input.moderationStatus) f.moderationStatus = input.moderationStatus;
    if (input.reviewNote !== undefined) f.reviewNote = input.reviewNote || null;
    f.reviewedBy = req.auth!.adminId;
    f.reviewedAt = new Date();
    await f.save();
    await audit(req, 'feedback.moderated', 'feedback', id, { status: f.moderationStatus, noteChanged: input.reviewNote !== undefined });
    ok(res, toFeedbackDTO(f.toObject()));
  });

  // ───────────── Analytics ─────────────
  r.get('/analytics', requirePermission('analytics:read'), async (req, res) => {
    const q = parse(dateRangeQuerySchema, req.query);
    ok(res, await analyticsSummary(resolveDateRange(q)));
  });

  // ───────────── Media library ─────────────
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 1, fields: 4 },
  });

  r.get('/media', requireAnyPermission('media:write', 'content:read'), async (_req, res) => {
    const items = await MediaAsset.find().sort({ createdAt: -1 }).limit(200).lean();
    ok(res, items.map((a) => toMediaDTO(a as never)));
  });

  r.post('/media', requirePermission('media:write'), upload.single('file'), async (req, res) => {
    if (!req.file) throw new ApiError(400, 'NO_FILE', 'Attach an image in the "file" field');
    const altText = typeof req.body?.altText === 'string' ? req.body.altText.slice(0, 300).trim() : '';
    const asset = await storeImage({
      uploadDir: config.uploadDir,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      altText,
      uploadedBy: req.auth!.adminId,
    });
    await audit(req, 'media.uploaded', 'media', String(asset._id), { mime: asset.mimeType, bytes: asset.bytes });
    ok(res, toMediaDTO(asset.toObject() as never), undefined, 201);
  });

  r.patch('/media/:id', requirePermission('media:write'), async (req, res) => {
    const id = parse(objectIdSchema, req.params.id);
    const { altText } = parse(mediaUpdateSchema, req.body);
    const a = await MediaAsset.findByIdAndUpdate(id, { $set: { altText } }, { new: true }).lean();
    if (!a) throw notFound('Media');
    await audit(req, 'media.updated', 'media', id);
    ok(res, toMediaDTO(a as never));
  });

  r.delete('/media/:id', requirePermission('media:write'), async (req, res) => {
    const id = parse(objectIdSchema, req.params.id);
    const a = await MediaAsset.findById(id).lean();
    if (!a) throw notFound('Media');
    const inDraft =
      (await CandidateProfile.exists({ $or: [{ portraitAssetId: a._id }, { 'pose.assetId': a._id }] })) ||
      (await Milestone.exists({ illustrationAssetId: a._id }));
    const inPublished = await ContentVersion.exists({ $or: [{ 'snapshot._raw.portraitAssetId': a._id }, { 'snapshot._raw.pose.assetId': a._id }, { 'snapshot._rawMilestones.illustrationAssetId': a._id }] });
    if (inDraft || inPublished) {
      throw new ApiError(409, 'MEDIA_IN_USE', 'This image is used by draft or published content. Replace it there first.');
    }
    await deleteImageFiles(config.uploadDir, a as never);
    await MediaAsset.deleteOne({ _id: a._id });
    await audit(req, 'media.deleted', 'media', id);
    ok(res, { deleted: true });
  });

  return r;
}
