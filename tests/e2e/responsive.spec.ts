import { expect, test } from '@playwright/test';

/** Responsive sweep: 10 viewports × 2 languages. Set SCREENSHOTS=1 to also write docs/screenshots/refinement/*. */
const SHOTS = process.env.SCREENSHOTS === '1';
const SIZES: Array<[number, number]> = [
  [320, 568], [360, 740], [375, 812], [390, 844], [414, 896], [768, 1024], [820, 1180], [1024, 768], [1366, 768], [1920, 1080],
];

for (const [w, h] of SIZES) {
  for (const locale of ['so', 'en'] as const) {
    test(`responsive ${w}x${h} ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await page.evaluate((l) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('reveal.locale', l); }, locale);
      const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

      // Intro: portrait fully visible, CTA on screen, no overflow.
      await page.goto('/?intro=1');
      const portrait = page.getByTestId('intro-portrait');
      await expect(portrait).toBeVisible();
      await page.waitForTimeout(1300);
      const pb = (await portrait.boundingBox())!;
      expect(pb.y).toBeGreaterThanOrEqual(0);
      expect(pb.y + pb.height).toBeLessThanOrEqual(h + 1);
      const cta = (await page.getByTestId('intro-cta').boundingBox())!;
      expect(cta.y + cta.height).toBeLessThanOrEqual(h + 1);
      expect(await page.getByTestId('brand-logo').isVisible()).toBe(true);
      expect(await noOverflow()).toBe(true);

      // Vision: markers inside the photo, not overlapping each other, no overflow.
      await page.goto('/vision');
      const keys = ['education', 'unity', 'leadership', 'about'];
      const boxes = [];
      for (const k of keys) boxes.push((await page.getByTestId(`hotspot-${k}`).boundingBox())!);
      const img = (await page.getByRole('img', { name: /Eng\. Zakariye/ }).boundingBox())!;
      for (const b of boxes) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(w + 1);
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.x + b.width / 2).toBeGreaterThanOrEqual(img.x - 1);
        expect(b.x + b.width / 2).toBeLessThanOrEqual(img.x + img.width + 1);
      }
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!, b = boxes[j]!;
          const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
          expect(overlap, `${keys[i]} overlaps ${keys[j]}`).toBe(false);
        }
      expect(await noOverflow()).toBe(true);

      // Roadmap + feedback popup fits the screen.
      await page.goto('/roadmap/midnimo');
      expect(await noOverflow()).toBe(true);
      await page.getByTestId('roadmap-conclusion').scrollIntoViewIfNeeded();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(500);
      const db = (await dialog.boundingBox())!;
      expect(db.x).toBeGreaterThanOrEqual(0);
      expect(db.x + db.width).toBeLessThanOrEqual(w + 1);
      expect(db.y).toBeGreaterThanOrEqual(0);
      expect(db.y + db.height).toBeLessThanOrEqual(h + 1);
      await expect(dialog.getByRole('textbox')).toBeVisible();
      if (SHOTS && (w <= 414 || w === 1366)) await page.screenshot({ path: `docs/screenshots/refinement/${w}x${h}-${locale}-popup.png` });
      await page.keyboard.press('Escape');
      if (SHOTS && (w === 320 || w === 390 || w === 1366)) {
        await page.goto('/vision');
        await page.waitForTimeout(900);
        await page.screenshot({ path: `docs/screenshots/refinement/${w}x${h}-${locale}-vision.png` });
        await page.goto('/?intro=1');
        await page.waitForTimeout(1400);
        await page.screenshot({ path: `docs/screenshots/refinement/${w}x${h}-${locale}-intro.png` });
      }
    });
  }
}
