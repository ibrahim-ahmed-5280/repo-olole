import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { E2E_USERS } from './credentials';

const owner = E2E_USERS.find((u) => u.role === 'owner')!;

async function freshVisit(page: Page, url = '/') {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(url);
}

async function signIn(page: Page, username: string, password: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

test.describe('public experience', () => {
  test('1–4: landing, portrait, mystery mark and reveal', async ({ page }) => {
    await freshVisit(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('YAA KA DAMBEEYA ARAGTIDA?');
    const portrait = page.getByRole('img', { name: /Eng\. Zakariye Mohamed Omar/ });
    await expect(portrait).toBeVisible();
    expect(await portrait.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('svg text', { hasText: '?' })).toBeVisible();
    await axe(page);
    const cta = page.getByRole('button', { name: 'DAAH-FUR ARAGTIDA' });
    await cta.click();
    await expect(page).toHaveURL(/\/vision$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Eng. Zakariye Mohamed Omar' })).toBeVisible();
  });

  test('intro portrait drops in from the top and settles centred; CTA rises in below it', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    const box = page.getByTestId('intro-portrait').locator('> div').first(); // the animated portrait box
    await box.waitFor({ state: 'attached' });
    const early = (await box.boundingBox())!;
    await page.waitForTimeout(2300);
    const settled = (await box.boundingBox())!;
    expect(early.y).toBeLessThan(settled.y - 40); // started ABOVE, moved DOWN
    const vw = page.viewportSize()!.width;
    expect(Math.abs(settled.x + settled.width / 2 - vw / 2)).toBeLessThanOrEqual(2); // horizontally centred
    const cta = (await page.getByTestId('intro-cta').boundingBox())!;
    expect(cta.y).toBeGreaterThan(settled.y + settled.height); // CTA below the portrait
    expect(Math.abs(cta.x + cta.width / 2 - vw / 2)).toBeLessThanOrEqual(2);
    await expect(page.getByTestId('intro-cta')).toBeInViewport();
    await page.getByTestId('intro-cta').click();
    await expect(page).toHaveURL(/\/vision$/);
  });

  test('returning visitors skip the intro; skip link works', async ({ page }) => {
    await freshVisit(page);
    await page.getByRole('link', { name: 'Ka gudub hordhaca' }).click();
    await expect(page).toHaveURL(/\/vision$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/vision$/);
  });

  for (const [key, slug, name] of [
    ['education', 'waxbarasho', 'WAXBARASHO'],
    ['unity', 'midnimo', 'MIDNIMO'],
    ['leadership', 'hoggaan', 'HOGGAAN'],
  ] as const) {
    test(`5–7: ${key} hotspot opens the ${slug} roadmap`, async ({ page }) => {
      await page.goto('/vision');
      await page.getByTestId(`hotspot-${key}`).click();
      await expect(page).toHaveURL(new RegExp(`/roadmap/${slug}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    });
  }

  test('hotspots stay anatomically ordered (education left of unity, about above leadership)', async ({ page }) => {
    await page.goto('/vision');
    const box = async (id: string) => (await page.getByTestId(id).boundingBox())!;
    const [edu, unity, lead, about] = await Promise.all(['hotspot-education', 'hotspot-unity', 'hotspot-leadership', 'hotspot-about'].map(box));
    expect(edu!.x).toBeLessThan(unity!.x);
    expect(about!.y).toBeLessThan(lead!.y);
  });

  test('8–9: chest question mark opens About; Escape closes and restores focus', async ({ page }) => {
    await page.goto('/vision');
    const trigger = page.getByTestId('hotspot-about');
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Ku saabsan musharaxa' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/panel=about/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('10–15: milestone navigation, progress, feedback with suggestion', async ({ page }) => {
    await freshVisit(page, '/roadmap/waxbarasho');
    await expect(page.getByTestId('progress-text')).toContainText('1 ee 6');
    await page.getByTestId('next-milestone').click();
    await expect(page.getByTestId('progress-text')).toContainText('2 ee 6');
    const before = Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'));
    await page.getByTestId('next-milestone').click();
    await expect(page.getByTestId('progress-text')).toContainText('3 ee 6');
    await page.getByTestId('prev-milestone').click();
    await expect(page.getByTestId('progress-text')).toContainText('2 ee 6');

    await page.getByTestId('roadmap-conclusion').scrollIntoViewIfNeeded();
    await expect.poll(async () => Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))).toBe(100);
    expect(before).toBeLessThan(100);

    const form = page.getByTestId('feedback-form');
    await expect(form).toBeVisible();
    await form.getByText('Haa').click();
    await form.getByLabel(/Maxaad hagaajin/).fill('E2E suggestion: more study rooms');
    await form.getByRole('button', { name: 'Dir fikradda' }).click();
    await expect(page.getByTestId('feedback-success')).toBeVisible();
  });

  test('24–25: refreshing a nested route works and back navigation returns', async ({ page }) => {
    await page.goto('/vision');
    await page.getByTestId('pillar-link-midnimo').click();
    await expect(page).toHaveURL(/\/roadmap\/midnimo$/);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('MIDNIMO');
    await page.goBack();
    await expect(page).toHaveURL(/\/vision$/);
    await axe(page);
  });

  test('22: keyboard navigation reaches every destination', async ({ page }) => {
    await page.goto('/vision');
    const reached = new Set<string>();
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const href = await page.evaluate(() => (document.activeElement as HTMLAnchorElement | null)?.getAttribute('href') ?? (document.activeElement as HTMLElement | null)?.dataset.testid ?? '');
      if (href) reached.add(href);
    }
    for (const target of ['/roadmap/waxbarasho', '/roadmap/midnimo', '/roadmap/hoggaan', 'hotspot-about']) expect([...reached]).toContain(target);
    await page.goto('/vision');
    await page.getByTestId('pillar-link-hoggaan').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/roadmap\/hoggaan$/);
  });

  test('23: reduced-motion mode renders all content without waiting for animations', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await page.getByRole('button', { name: 'DAAH-FUR ARAGTIDA' }).click();
    await expect(page).toHaveURL(/\/vision$/, { timeout: 2000 });
    await page.goto('/roadmap/hoggaan');
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
    await ctx.close();
  });

  test('21 @mobile: mobile layout has no horizontal overflow and keeps 44px targets', async ({ page }) => {
    await page.goto('/vision');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const id of ['hotspot-education', 'hotspot-unity', 'hotspot-leadership', 'hotspot-about']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByTestId('pillar-link-waxbarasho').click();
    await expect(page).toHaveURL(/\/roadmap\/waxbarasho$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe('responsive sweep', () => {
  const VIEWPORTS = [
    [320, 568], [360, 800], [375, 812], [390, 844], [430, 932],
    [768, 1024], [1024, 768], [1366, 768], [1440, 900], [1920, 1080],
  ] as const;
  for (const [w, h] of VIEWPORTS) {
    test(`${w}×${h}: no horizontal scroll, CTA visible, hotspots inside the portrait and not overlapping`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await freshVisit(page);
      const cta = page.getByRole('button', { name: 'DAAH-FUR ARAGTIDA' });
      await expect(cta).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.waitForTimeout(1800);
      const portrait = (await page.getByTestId('intro-portrait').boundingBox())!;
      const ctaBox = (await cta.boundingBox())!;
      expect(Math.abs(portrait.x + portrait.width / 2 - w / 2)).toBeLessThanOrEqual(2);
      expect(ctaBox.y).toBeGreaterThan(portrait.y + portrait.height - 1);
      expect(ctaBox.y + ctaBox.height).toBeLessThanOrEqual(h);
      expect(portrait.y).toBeGreaterThanOrEqual(0);
      const qm = (await page.locator('[data-testid=intro-portrait] svg').first().boundingBox())!;
      expect(qm.x).toBeGreaterThan(portrait.x);
      expect(qm.x + qm.width).toBeLessThan(portrait.x + portrait.width);
      expect(qm.y).toBeGreaterThan(portrait.y);

      await page.goto('/vision');
      await expect(page.getByTestId('hotspot-about')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const boxes = await Promise.all(['education', 'unity', 'leadership', 'about'].map(async (k) => (await page.getByTestId(`hotspot-${k}`).boundingBox())!));
      for (let i = 0; i < boxes.length; i++) {
        expect(boxes[i]!.x).toBeGreaterThanOrEqual(0);
        expect(boxes[i]!.x + boxes[i]!.width).toBeLessThanOrEqual(w);
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!, b = boxes[j]!;
          const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
          expect(overlap).toBe(false);
        }
      }

      await page.goto('/roadmap/midnimo');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});

test.describe('admin', () => {
  test('17: rejects invalid credentials', async ({ page }) => {
    await signIn(page, owner.username, 'wrong-password-1A');
    await expect(page.getByTestId('login-error')).toHaveText('Incorrect username or password');
  });

  test('16, 18–20: sign in, edit + publish updates the public site, charts use API data', async ({ page }) => {
    await signIn(page, owner.username, owner.password);
    await expect(page.getByRole('heading', { name: 'Dashboard overview' })).toBeVisible();
    // 20: KPI comes from the API (earlier tests generated real page views)
    await expect.poll(async () => Number((await page.getByTestId('kpi-pageviews').locator('p').nth(1).textContent()) ?? 0)).toBeGreaterThan(0);

    await page.goto('/admin/roadmaps/hoggaan');
    await page.getByTestId('add-milestone').click();
    await page.getByRole('dialog').getByLabel('Title').fill('E2E Published Milestone');
    await page.getByRole('dialog').getByLabel('Short description (shown on the card)').fill('Created by the end-to-end test');
    await page.getByTestId('save-milestone').click();
    await expect(page.getByText('E2E Published Milestone')).toBeVisible();

    // Draft is not public yet
    const before = await page.request.get('/api/v1/pillars/hoggaan');
    expect(JSON.stringify(await before.json())).not.toContain('E2E Published Milestone');

    await page.getByTestId('publish').click();
    await expect(page.getByText(/Published version/)).toBeVisible();

    await page.goto('/roadmap/hoggaan');
    await expect(page.getByRole('heading', { name: /E2E Published Milestone/ })).toBeVisible();

    await page.goto('/admin/feedback');
    await expect(page.getByText('E2E suggestion: more study rooms')).toBeVisible();

    await page.goto('/admin/analytics');
    await expect.poll(async () => Number((await page.getByTestId('analytics-pageviews').locator('p').nth(1).textContent()) ?? 0)).toBeGreaterThan(0);
    await expect(page.locator('.recharts-surface').first()).toBeVisible();
    await axe(page);

    await page.getByTestId('logout').click();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
