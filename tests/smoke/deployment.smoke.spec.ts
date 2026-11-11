import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Deployment smoke tests — safe to run against staging or production.
 * Read-only unless SMOKE_WRITE=1. Never logs in (admin checks are manual, see docs/POST_DEPLOYMENT_VERIFICATION.md).
 */
const BASE = process.env.SMOKE_BASE_URL!;
const isHttps = BASE.startsWith('https://');
const isLocalTunnel = /\/\/(localhost|127\.0\.0\.1)/.test(BASE);

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function fresh(page: Page, url = '/') {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(url);
}

test.describe('API & server', () => {
  test('24: API health reports database up', async ({ request }) => {
    const res = await request.get('/api/v1/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ status: 'ok', db: 'up' });
  });

  test('published content is available from the API', async ({ request }) => {
    const pillars = await (await request.get('/api/v1/pillars')).json();
    expect(pillars.data.map((p: { slug: string }) => p.slug)).toEqual(['waxbarasho', 'midnimo', 'hoggaan']);
    expect((await request.get('/api/v1/candidate')).status()).toBe(200);
  });

  test('security headers are present', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['content-security-policy']).not.toContain('upgrade-insecure-requests');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-powered-by']).toBeUndefined();
    if (isHttps) expect(h['strict-transport-security']).toContain('max-age=');
  });

  test('unknown API paths return JSON 404, never the SPA', async ({ request }) => {
    const res = await request.get('/api/v1/does-not-exist');
    expect(res.status()).toBe(404);
    expect(res.headers()['content-type']).toContain('application/json');
  });

  test('admin API rejects anonymous access', async ({ request }) => {
    expect((await request.get('/api/v1/admin/dashboard')).status()).toBe(401);
  });

  test('robots.txt and sitemap use the public origin', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/roadmap/hoggaan');
    if (isHttps) expect(sitemap).toContain(new URL(BASE).origin);
  });

  test('built JavaScript contains no development API origins', async ({ page, request }) => {
    await page.goto('/');
    const scripts = await page.locator('script[src]').evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) {
      const js = await (await request.get(src)).text();
      expect(js).not.toMatch(/localhost:4000|127\.0\.0\.1:4000|localhost:5173/);
    }
    if (isHttps) {
      const html = await (await request.get('/')).text();
      expect(html).toContain(`<link rel="canonical" href="${new URL(BASE).origin}/"`);
    }
  });
});

test.describe('public experience', () => {
  test('1–4: landing, large centred portrait, mystery mark, reveal button → /vision', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await fresh(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('YAA KA DAMBEEYA ARAGTIDA?');
    const portrait = page.getByTestId('intro-portrait');
    await expect(portrait).toBeVisible();
    await page.waitForTimeout(2000);
    const box = (await portrait.boundingBox())!;
    const vw = page.viewportSize()!.width;
    expect(Math.abs(box.x + box.width / 2 - vw / 2)).toBeLessThanOrEqual(2);
    expect(box.height / page.viewportSize()!.height).toBeGreaterThan(0.45);
    await expect(page.locator('[data-testid=intro-portrait] svg text', { hasText: '?' })).toBeVisible();
    const cta = page.getByTestId('intro-cta');
    await expect(cta).toBeInViewport();
    await cta.click();
    await expect(page).toHaveURL(/\/vision$/);
    expect(errors).toEqual([]);
  });

  test('5–6: interactive hands and chest hotspots', async ({ page }) => {
    await page.goto('/vision');
    for (const k of ['education', 'unity', 'leadership', 'about']) await expect(page.getByTestId(`hotspot-${k}`)).toBeVisible();
    const edu = (await page.getByTestId('hotspot-education').boundingBox())!;
    const unity = (await page.getByTestId('hotspot-unity').boundingBox())!;
    expect(edu.x).toBeLessThan(unity.x);
  });

  for (const [slug, name] of [['waxbarasho', 'WAXBARASHO'], ['midnimo', 'MIDNIMO'], ['hoggaan', 'HOGGAAN']] as const) {
    test(`7–9: ${name} roadmap renders with milestones and feedback form`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto('/vision');
      await page.getByTestId(`pillar-link-${slug}`).click();
      await expect(page).toHaveURL(new RegExp(`/roadmap/${slug}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
      expect(await page.getByRole('heading', { level: 3 }).count()).toBeGreaterThan(0);
      await page.getByTestId('roadmap-conclusion').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('feedback-form').or(page.getByTestId('feedback-success'))).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('10: About panel opens and closes', async ({ page }) => {
    await page.goto('/vision');
    await page.getByTestId('hotspot-about').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('21: refreshing nested URLs works (SPA fallback)', async ({ page }) => {
    for (const path of ['/roadmap/midnimo', '/vision', '/privacy', '/admin/login']) {
      const res = await page.goto(path);
      expect(res!.status()).toBe(200);
    }
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
  });

  test('20: accessibility (axe, serious/critical) on landing and vision', async ({ page }) => {
    for (const path of ['/?intro=1', '/vision']) {
      await page.goto(path);
      await page.waitForTimeout(1500);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
    }
  });

  test('19 @mobile: mobile layout has no horizontal overflow and CTA is visible', async ({ page }) => {
    await fresh(page);
    await expect(page.getByTestId('intro-cta')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto('/vision');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('11–12: feedback submission persists (only with SMOKE_WRITE=1)', async ({ page }) => {
    test.skip(process.env.SMOKE_WRITE !== '1', 'read-only run — set SMOKE_WRITE=1 to submit one labelled feedback entry');
    await fresh(page, '/roadmap/waxbarasho');
    await page.getByTestId('roadmap-conclusion').scrollIntoViewIfNeeded();
    const form = page.getByTestId('feedback-form');
    await form.getByText('Haa').click();
    await form.getByRole('textbox').fill(`[deployment smoke test ${new Date().toISOString()}] please hide`);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/v1/feedback') && r.request().method() === 'POST'),
      form.getByRole('button', { name: 'Dir fikradda' }).click(),
    ]);
    expect(res.status()).toBe(201);
    await expect(page.getByTestId('feedback-success')).toBeVisible();
  });
});

/*
 * Cookie flags (Secure, HttpOnly, SameSite=Strict) are asserted by the API integration tests and checked
 * manually after a real owner login (docs/POST_DEPLOYMENT_VERIFICATION.md). This smoke test uses no credentials.
 * Note: it records one "auth.login_failed" audit entry for the fake user "smoke-test-nonexistent".
 */
test('login endpoint rejects unknown users safely and is rate limited', async ({ request }) => {
  const res = await request.post('/api/v1/admin/auth/login', {
    data: { username: 'smoke-test-nonexistent', password: 'x' },
    headers: { Origin: new URL(BASE).origin },
  });
  expect([401, 429]).toContain(res.status());
  expect(res.headers()['ratelimit-policy'] ?? res.headers()['ratelimit']).toBeTruthy();
  expect(res.headers()['set-cookie']).toBeUndefined();
  void isLocalTunnel;
});
