import { Router } from 'express';
import mongoose from 'mongoose';
import {
  PILLAR_SLUGS,
  analyticsEventSchema,
  feedbackInputSchema,
  pillarSlugSchema,
  type CandidateDTO,
  type PillarDTO,
  type RoadmapDTO,
  type SiteSettingsDTO,
} from '@reveal/shared';
import type { AppConfig } from '../config/env';
import type { Limiters } from '../middleware/rateLimit';
import { ApiError, ok, parse } from '../lib/http';
import { getPublished } from '../services/content';
import { recordEvent } from '../services/analytics';
import { Pillar } from '../models/content';
import { Feedback } from '../models/records';

export const DEFAULT_SITE: SiteSettingsDTO = {
  branding: { siteName: 'THE REVEAL', tagline: 'Discover the Vision', campaignContext: '' },
  animationsEnabled: true,
  introEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
  socialLinks: [],
  privacyNotice: '',
  publishedAt: null,
};

const notPublished = () => new ApiError(404, 'NOT_PUBLISHED', 'This content has not been published yet');

export function publicRouter(config: AppConfig, limiters: Limiters) {
  const r = Router();

  r.get('/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ ok: dbUp, data: { status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down', time: new Date().toISOString() } });
  });

  r.use(limiters.public);

  const cachePublic = (res: import('express').Response) => res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');

  r.get('/site', async (_req, res) => {
    cachePublic(res);
    ok(res, (await getPublished<SiteSettingsDTO>('settings', 'main')) ?? DEFAULT_SITE);
  });

  r.get('/candidate', async (_req, res) => {
    const c = await getPublished<CandidateDTO>('candidate', 'main');
    if (!c) throw notPublished();
    cachePublic(res);
    ok(res, c);
  });

  r.get('/pillars', async (_req, res) => {
    const all = await Promise.all(PILLAR_SLUGS.map((s) => getPublished<RoadmapDTO>('pillar', s)));
    const list: PillarDTO[] = all
      .filter((p): p is RoadmapDTO => !!p)
      .map(({ milestones, version: _v, publishedAt: _p, ...p }) => ({ ...p, milestoneCount: milestones.length }))
      .sort((a, b) => a.order - b.order);
    cachePublic(res);
    ok(res, list);
  });

  r.get('/pillars/:slug', async (req, res) => {
    const slug = parse(pillarSlugSchema, req.params.slug);
    const p = await getPublished<RoadmapDTO>('pillar', slug);
    if (!p) throw notPublished();
    cachePublic(res);
    ok(res, p);
  });

  r.get('/pillars/:slug/milestones', async (req, res) => {
    const slug = parse(pillarSlugSchema, req.params.slug);
    const p = await getPublished<RoadmapDTO>('pillar', slug);
    if (!p) throw notPublished();
    cachePublic(res);
    ok(res, p.milestones);
  });

  r.post('/feedback', limiters.feedback, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    // Honeypot: silently accept and drop automated submissions.
    if (req.body && typeof req.body.website === 'string' && req.body.website.length > 0) {
      return ok(res, { received: true }, undefined, 201);
    }
    const input = parse(feedbackInputSchema, req.body);
    const pillar = await Pillar.findOne({ slug: input.pillar }).select('_id publishedVersion').lean();
    if (!pillar?.publishedVersion) throw notPublished();
    const fb = await Feedback.create({
      pillar: input.pillar,
      pillarId: pillar._id,
      response: input.response,
      suggestion: input.suggestion ?? null,
    });
    // Feedback totals are aggregated directly from the feedback collection; nothing links it to a session.
    ok(res, { received: true, id: String(fb._id) }, undefined, 201);
  });

  r.post('/analytics/events', limiters.events, async (req, res) => {
    const input = parse(analyticsEventSchema, req.body);
    const result = await recordEvent(input, config.ANALYTICS_SECRET);
    res.set('Cache-Control', 'no-store');
    ok(res, result, undefined, 202);
  });

  return r;
}
