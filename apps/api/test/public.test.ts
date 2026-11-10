import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupTestApp } from './helpers';
import { Feedback } from '../src/models/records';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => {
  ctx = await setupTestApp({ limits: { feedbackPerHour: 9 } });
});
afterAll(() => ctx.teardown());

describe('public content API', () => {
  it('reports health', async () => {
    const res = await request(ctx.app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.db).toBe('up');
  });

  it('returns site settings, candidate and pillars', async () => {
    const site = await request(ctx.app).get('/api/v1/site');
    expect(site.body.data.branding.siteName).toBe('THE REVEAL');
    const cand = await request(ctx.app).get('/api/v1/candidate');
    expect(cand.status).toBe(200);
    expect(cand.body.data.name).toBe('Eng. Zakariye Mohamed Omar');
    expect(cand.body.data._raw).toBeUndefined();
    const pillars = await request(ctx.app).get('/api/v1/pillars');
    expect(pillars.body.data.map((p: { slug: string }) => p.slug)).toEqual(['waxbarasho', 'midnimo', 'hoggaan']);
  });

  it('returns a roadmap with ordered, example-flagged milestones and no admin-only fields', async () => {
    const res = await request(ctx.app).get('/api/v1/pillars/midnimo');
    expect(res.status).toBe(200);
    const orders = res.body.data.milestones.map((m: { order: number }) => m.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(res.body.data.milestones[0].isExample).toBe(true);
    expect(res.body.data.hiddenMilestones).toBeUndefined();
    expect(res.body.data._rawMilestones).toBeUndefined();
    const ms = await request(ctx.app).get('/api/v1/pillars/midnimo/milestones');
    expect(ms.body.data).toHaveLength(6);
  });

  it('rejects unknown pillars', async () => {
    const res = await request(ctx.app).get('/api/v1/pillars/unknown');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(ctx.app).get('/api/v1/site');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('serves the OpenAPI document, robots.txt and sitemap', async () => {
    expect((await request(ctx.app).get('/api/v1/openapi.json')).body.openapi).toBe('3.1.0');
    expect((await request(ctx.app).get('/robots.txt')).text).toContain('Disallow: /admin');
    expect((await request(ctx.app).get('/sitemap.xml')).text).toContain('/roadmap/hoggaan');
  });
});

describe('feedback submission', () => {
  it('stores valid anonymous feedback with an optional suggestion', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/feedback')
      .send({ pillar: 'waxbarasho', response: 'yes', suggestion: '  More study groups  ' });
    expect(res.status).toBe(201);
    const stored = await Feedback.findById(res.body.data.id).lean();
    expect(stored?.suggestion).toBe('More study groups');
    expect(stored?.moderationStatus).toBe('new');
    expect(Object.keys(stored!)).not.toContain('ip');
  });

  it('rejects invalid payloads', async () => {
    const bad = [
      { pillar: 'waxbarasho' },
      { pillar: 'waxbarasho', response: 'maybe' },
      { pillar: 'nope', response: 'yes' },
      { pillar: 'waxbarasho', response: 'yes', studentId: '123' },
      { pillar: 'waxbarasho', response: 'yes', suggestion: 'x'.repeat(1001) },
    ];
    for (const body of bad) {
      const res = await request(ctx.app).post('/api/v1/feedback').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects malformed JSON and oversized bodies safely', async () => {
    const res = await request(ctx.app).post('/api/v1/feedback').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain('at ');
    const big = await request(ctx.app).post('/api/v1/feedback').send({ pillar: 'waxbarasho', response: 'yes', suggestion: 'x'.repeat(200_000) });
    expect(big.status).toBe(413);
  });

  it('rejects requests from origins outside the allowlist', async () => {
    const res = await request(ctx.app).post('/api/v1/feedback').set('Origin', 'https://evil.example').send({ pillar: 'midnimo', response: 'yes' });
    expect(res.status).toBe(403);
  });

  it('rate limits repeated submissions', async () => {
    let last = 0;
    for (let i = 0; i < 5; i++) {
      last = (await request(ctx.app).post('/api/v1/feedback').send({ pillar: 'midnimo', response: 'no' })).status;
    }
    expect(last).toBe(429);
  });
});

describe('analytics events', () => {
  it('accepts events and de-duplicates them per session', async () => {
    const ev = { type: 'page_view', route: '/vision', sid: 'abcdefghijklmnop1234' };
    const first = await request(ctx.app).post('/api/v1/analytics/events').send(ev);
    expect(first.status).toBe(202);
    expect(first.body.data.counted).toBe(true);
    const second = await request(ctx.app).post('/api/v1/analytics/events').send(ev);
    expect(second.body.data.counted).toBe(false);
  });

  it('rejects unknown event types', async () => {
    const res = await request(ctx.app).post('/api/v1/analytics/events').send({ type: 'fingerprint', route: '/', sid: 'abcdefghijklmnop' });
    expect(res.status).toBe(400);
  });
});
