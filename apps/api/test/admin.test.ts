import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { login, setupTestApp, TEST_PASSWORD } from './helpers';
import { AdminSession } from '../src/models/admin';
import { AuditLog } from '../src/models/records';
import { clearPublishedCache } from '../src/services/content';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => {
  ctx = await setupTestApp({ limits: { loginPer15Min: 50 } });
});
afterAll(() => ctx.teardown());

describe('admin authentication', () => {
  it('signs in with valid credentials and sets hardened cookies', async () => {
    const { agent, res } = await login(ctx.app, 'owner');
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const sid = cookies.find((c) => c.startsWith('reveal_sid='))!;
    expect(sid).toMatch(/HttpOnly/i);
    expect(sid).toMatch(/SameSite=Strict/i);
    expect(cookies.some((c) => c.startsWith('reveal_csrf='))).toBe(true);
    const me = await agent.get('/api/v1/admin/auth/me');
    expect(me.body.data.user.role).toBe('owner');
    expect(me.body.data.permissions).toContain('content:publish');
  });

  it('rejects invalid credentials with a generic message and audits the attempt', async () => {
    const res = await request(ctx.app).post('/api/v1/admin/auth/login').send({ username: 'owner', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Incorrect username or password');
    const unknown = await request(ctx.app).post('/api/v1/admin/auth/login').send({ username: 'ghost', password: 'x' });
    expect(unknown.body.error.message).toBe('Incorrect username or password');
    expect(await AuditLog.countDocuments({ action: 'auth.login_failed' })).toBeGreaterThanOrEqual(2);
  });

  it('logs out and invalidates the session', async () => {
    const { agent, csrf } = await login(ctx.app, 'editor');
    expect((await agent.post('/api/v1/admin/auth/logout').set('X-CSRF-Token', csrf)).status).toBe(200);
    expect((await agent.get('/api/v1/admin/auth/me')).status).toBe(401);
  });

  it('expires sessions', async () => {
    const { agent } = await login(ctx.app, 'reviewer');
    await AdminSession.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await agent.get('/api/v1/admin/auth/me')).status).toBe(401);
  });

  it('expires idle sessions', async () => {
    const { agent } = await login(ctx.app, 'reviewer');
    await AdminSession.updateMany({ revokedAt: null }, { $set: { lastSeenAt: new Date(Date.now() - 24 * 3600_000) } });
    expect((await agent.get('/api/v1/admin/auth/me')).status).toBe(401);
  });

  it('requires a CSRF token for mutations', async () => {
    const { agent } = await login(ctx.app, 'owner');
    const res = await agent.patch('/api/v1/admin/pillars/hoggaan').send({ tagline: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_FAILED');
  });

  it('rate limits sign-in attempts', async () => {
    const limited = await setupTestAppLite();
    let status = 0;
    for (let i = 0; i < 4; i++) {
      status = (await request(limited).post('/api/v1/admin/auth/login').send({ username: 'owner', password: 'nope' })).status;
    }
    expect(status).toBe(429);
  });
});

async function setupTestAppLite() {
  const { createApp } = await import('../src/app');
  const { createLogger } = await import('../src/config/logger');
  return createApp(ctx.config, createLogger('silent'), { limits: { loginPer15Min: 2 } });
}

describe('authorization', () => {
  it('blocks anonymous access to admin endpoints', async () => {
    for (const url of ['/api/v1/admin/dashboard', '/api/v1/admin/feedback', '/api/v1/admin/candidate', '/api/v1/admin/audit-logs']) {
      expect((await request(ctx.app).get(url)).status).toBe(401);
    }
  });

  it('enforces role permissions in the backend', async () => {
    const editor = await login(ctx.app, 'editor');
    expect((await editor.agent.get('/api/v1/admin/feedback')).status).toBe(403);
    expect((await editor.agent.post('/api/v1/admin/pillars/hoggaan/publish').set('X-CSRF-Token', editor.csrf)).status).toBe(403);
    expect((await editor.agent.get('/api/v1/admin/users')).status).toBe(403);

    const reviewer = await login(ctx.app, 'reviewer');
    expect((await reviewer.agent.get('/api/v1/admin/feedback')).status).toBe(200);
    expect((await reviewer.agent.patch('/api/v1/admin/candidate').set('X-CSRF-Token', reviewer.csrf).send({ name: 'Hacked' })).status).toBe(403);
    expect((await reviewer.agent.get('/api/v1/admin/analytics')).status).toBe(200);
  });

  it('prevents mass assignment', async () => {
    const owner = await login(ctx.app, 'owner');
    const res = await owner.agent.patch('/api/v1/admin/candidate').set('X-CSRF-Token', owner.csrf).send({ name: 'X', publishedVersion: 99 });
    expect(res.status).toBe(400);
  });
});

describe('content publishing workflow', () => {
  it('keeps drafts private until published, then updates the public site', async () => {
    const editor = await login(ctx.app, 'editor');
    const owner = await login(ctx.app, 'owner');

    const created = await editor.agent
      .post('/api/v1/admin/milestones')
      .set('X-CSRF-Token', editor.csrf)
      .send({ pillar: 'hoggaan', title: 'Approved Milestone', summary: 'Approved summary', icon: 'flag' });
    expect(created.status).toBe(201);
    const msId = created.body.data.id;

    clearPublishedCache();
    let pub = await request(ctx.app).get('/api/v1/pillars/hoggaan');
    expect(pub.body.data.milestones.some((m: { title: string }) => m.title === 'Approved Milestone')).toBe(false);

    const preview = await editor.agent.get('/api/v1/admin/preview/pillars/hoggaan');
    expect(preview.body.data.milestones.some((m: { title: string }) => m.title === 'Approved Milestone')).toBe(true);

    expect((await editor.agent.post('/api/v1/admin/pillars/hoggaan/request-review').set('X-CSRF-Token', editor.csrf)).status).toBe(200);
    const published = await owner.agent.post('/api/v1/admin/pillars/hoggaan/publish').set('X-CSRF-Token', owner.csrf);
    expect(published.status).toBe(200);
    expect(published.body.data.version).toBe(2);

    pub = await request(ctx.app).get('/api/v1/pillars/hoggaan');
    expect(pub.body.data.milestones.at(-1).title).toBe('Approved Milestone');

    // Reorder: move the new milestone first
    const detail = await editor.agent.get('/api/v1/admin/pillars/hoggaan');
    const ids: string[] = detail.body.data.milestones.map((m: { id: string }) => m.id);
    const reordered = [msId, ...ids.filter((i) => i !== msId)];
    expect((await editor.agent.put('/api/v1/admin/pillars/hoggaan/milestone-order').set('X-CSRF-Token', editor.csrf).send({ ids: reordered })).status).toBe(200);
    const preview2 = await editor.agent.get('/api/v1/admin/preview/pillars/hoggaan');
    expect(preview2.body.data.milestones[0].id).toBe(msId);

    // Hide a milestone in the draft
    await editor.agent.patch(`/api/v1/admin/milestones/${msId}`).set('X-CSRF-Token', editor.csrf).send({ status: 'hidden' });
    await owner.agent.post('/api/v1/admin/pillars/hoggaan/publish').set('X-CSRF-Token', owner.csrf);
    pub = await request(ctx.app).get('/api/v1/pillars/hoggaan');
    expect(pub.body.data.milestones.some((m: { id: string }) => m.id === msId)).toBe(false);

    // Restore version 2 (milestone visible, last), then publish → public shows it again
    const versions = await owner.agent.get('/api/v1/admin/versions?entityType=pillar&entityId=hoggaan');
    expect(versions.body.data.map((v: { version: number }) => v.version)).toEqual([3, 2, 1]);
    const v2 = versions.body.data.find((v: { version: number }) => v.version === 2);
    expect((await owner.agent.post(`/api/v1/admin/versions/${v2.id}/restore`).set('X-CSRF-Token', owner.csrf)).status).toBe(200);
    await owner.agent.post('/api/v1/admin/pillars/hoggaan/publish').set('X-CSRF-Token', owner.csrf);
    pub = await request(ctx.app).get('/api/v1/pillars/hoggaan');
    expect(pub.body.data.milestones.at(-1).id).toBe(msId);
  });

  it('unpublishes a roadmap', async () => {
    const owner = await login(ctx.app, 'owner');
    await owner.agent.post('/api/v1/admin/pillars/midnimo/unpublish').set('X-CSRF-Token', owner.csrf);
    expect((await request(ctx.app).get('/api/v1/pillars/midnimo')).status).toBe(404);
    expect((await request(ctx.app).post('/api/v1/feedback').send({ pillar: 'midnimo', response: 'yes' })).status).toBe(404);
    await owner.agent.post('/api/v1/admin/pillars/midnimo/publish').set('X-CSRF-Token', owner.csrf);
    expect((await request(ctx.app).get('/api/v1/pillars/midnimo')).status).toBe(200);
  });

  it('publishes candidate profile edits', async () => {
    const owner = await login(ctx.app, 'owner');
    await owner.agent.patch('/api/v1/admin/candidate').set('X-CSRF-Token', owner.csrf).send({ introduction: 'Approved intro', skills: ['Leadership'] });
    expect((await request(ctx.app).get('/api/v1/candidate')).body.data.introduction).toBe('');
    await owner.agent.post('/api/v1/admin/candidate/publish').set('X-CSRF-Token', owner.csrf);
    const c = await request(ctx.app).get('/api/v1/candidate');
    expect(c.body.data.introduction).toBe('Approved intro');
    expect(c.body.data.skills).toEqual(['Leadership']);
  });
});

describe('feedback moderation and analytics summaries', () => {
  it('moderates, filters and exports feedback', async () => {
    await request(ctx.app).post('/api/v1/feedback').send({ pillar: 'waxbarasho', response: 'yes', suggestion: 'Library hours' });
    await request(ctx.app).post('/api/v1/feedback').send({ pillar: 'waxbarasho', response: 'no', suggestion: '=cmd()' });
    await request(ctx.app).post('/api/v1/feedback').send({ pillar: 'hoggaan', response: 'yes' });
    const reviewer = await login(ctx.app, 'reviewer');
    const list = await reviewer.agent.get('/api/v1/admin/feedback?pillar=waxbarasho');
    expect(list.body.meta.total).toBe(2);
    const search = await reviewer.agent.get('/api/v1/admin/feedback?q=library');
    expect(search.body.data).toHaveLength(1);
    const id = search.body.data[0].id;
    const mod = await reviewer.agent.patch(`/api/v1/admin/feedback/${id}`).set('X-CSRF-Token', reviewer.csrf).send({ moderationStatus: 'reviewed', reviewNote: 'Noted' });
    expect(mod.body.data.moderationStatus).toBe('reviewed');
    const csv = await reviewer.agent.get('/api/v1/admin/feedback/export.csv');
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain(`"'=cmd()"`);
  });

  it('summarizes analytics from database aggregates', async () => {
    const sid = 'session-token-aaaaaaaa';
    for (const ev of [
      { type: 'page_view', route: '/vision', sid },
      { type: 'roadmap_view', route: '/roadmap/waxbarasho', pillar: 'waxbarasho', sid },
      { type: 'roadmap_complete', route: '/roadmap/waxbarasho', pillar: 'waxbarasho', sid },
      { type: 'roadmap_view', route: '/roadmap/waxbarasho', pillar: 'waxbarasho', sid: 'another-session-bbbbbb' },
    ]) {
      await request(ctx.app).post('/api/v1/analytics/events').send(ev);
    }
    const owner = await login(ctx.app, 'owner');
    const res = await owner.agent.get('/api/v1/admin/analytics');
    expect(res.status).toBe(200);
    const s = res.body.data;
    expect(s.totals.pageViews).toBe(1);
    expect(s.totals.sessions).toBe(2);
    const edu = s.roadmaps.find((r: { pillar: string }) => r.pillar === 'waxbarasho');
    expect(edu).toMatchObject({ views: 2, completions: 1, completionRate: 50 });
    const fb = s.feedback.find((f: { pillar: string }) => f.pillar === 'waxbarasho');
    expect(fb.total).toBe(2);
    expect(s.methodology).toMatch(/NOT unique people/);
    expect(s.daily.length).toBe(30);

    const dash = await owner.agent.get('/api/v1/admin/dashboard');
    expect(dash.body.data.analytics.totals.pageViews).toBe(1);
    expect(dash.body.data.feedback.total).toBeGreaterThan(0);
  });
});

describe('media, users and audit', () => {
  it('validates uploads by file signature', async () => {
    const owner = await login(ctx.app, 'owner');
    const fake = await owner.agent.post('/api/v1/admin/media').set('X-CSRF-Token', owner.csrf).attach('file', Buffer.from('<?php echo 1; ?>'.padEnd(64)), { filename: 'evil.jpg', contentType: 'image/jpeg' });
    expect(fake.status).toBe(415);
    const img = await fs.readFile(path.resolve(__dirname, '../../../assets/candidate/portrait-headshot.jpg'));
    const ok = await owner.agent.post('/api/v1/admin/media').set('X-CSRF-Token', owner.csrf).field('altText', 'Portrait').attach('file', img, 'p.jpg');
    expect(ok.status).toBe(201);
    expect(ok.body.data.variants.length).toBeGreaterThan(0);
    expect(ok.body.data.url).toMatch(/^\/media\/[a-f0-9-]+\.jpg$/);
    const served = await request(ctx.app).get(ok.body.data.url);
    expect(served.status).toBe(200);
    expect((await request(ctx.app).get('/media/..%2F..%2Fpackage.json')).status).toBeGreaterThanOrEqual(400);

    // In use → cannot delete
    await owner.agent.patch('/api/v1/admin/candidate').set('X-CSRF-Token', owner.csrf).send({ portraitAssetId: ok.body.data.id });
    expect((await owner.agent.delete(`/api/v1/admin/media/${ok.body.data.id}`).set('X-CSRF-Token', owner.csrf)).status).toBe(409);
  });

  it('manages admin users and protects the last owner', async () => {
    const owner = await login(ctx.app, 'owner');
    const weak = await owner.agent.post('/api/v1/admin/users').set('X-CSRF-Token', owner.csrf).send({ username: 'newbie', role: 'editor', password: 'weak' });
    expect(weak.status).toBe(400);
    const created = await owner.agent.post('/api/v1/admin/users').set('X-CSRF-Token', owner.csrf).send({ username: 'newbie', role: 'editor', password: 'Strong-Password-1' });
    expect(created.status).toBe(201);
    const self = (await owner.agent.get('/api/v1/admin/auth/me')).body.data.user.id;
    expect((await owner.agent.patch(`/api/v1/admin/users/${self}`).set('X-CSRF-Token', owner.csrf).send({ role: 'editor' })).status).toBe(400);
    await owner.agent.patch(`/api/v1/admin/users/${created.body.data.id}`).set('X-CSRF-Token', owner.csrf).send({ status: 'disabled' });
    expect((await request(ctx.app).post('/api/v1/admin/auth/login').send({ username: 'newbie', password: 'Strong-Password-1' })).status).toBe(401);
  });

  it('changes password and revokes other sessions', async () => {
    const a = await login(ctx.app, 'editor');
    const b = await login(ctx.app, 'editor');
    const res = await a.agent.post('/api/v1/admin/auth/password').set('X-CSRF-Token', a.csrf).send({ currentPassword: TEST_PASSWORD, newPassword: 'New-Password-456' });
    expect(res.status).toBe(200);
    expect((await b.agent.get('/api/v1/admin/auth/me')).status).toBe(401);
    expect((await a.agent.get('/api/v1/admin/auth/me')).status).toBe(200);
  });

  it('records an audit trail readable by owners only', async () => {
    const owner = await login(ctx.app, 'owner');
    const logs = await owner.agent.get('/api/v1/admin/audit-logs?action=content.published');
    expect(logs.body.meta.total).toBeGreaterThan(0);
    expect(JSON.stringify(logs.body)).not.toMatch(/passwordHash|Test-Password/);
  });
});
