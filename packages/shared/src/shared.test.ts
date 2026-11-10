import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  completionRate,
  computeRenderedBox,
  csvCell,
  enumerateDays,
  feedbackInputSchema,
  hasPermission,
  isoWeekKey,
  mapAnchor,
  markersOverlap,
  mediaUrl,
  normalizeOrder,
  pickActiveIndex,
  pointToAnchor,
  progressLabel,
  resolveDateRange,
  roadmapProgress,
  sortByOrder,
  stepIndex,
  summarizeFeedback,
  analyticsEventSchema,
  candidateUpdateSchema,
  createAdminSchema,
  otherPillars,
  ROUTES,
} from './index';

describe('hotspot coordinate mapping', () => {
  const natural = { width: 1000, height: 1250 }; // 4:5 portrait

  it('maps anchors 1:1 when the container matches the image ratio', () => {
    const p = mapAnchor({ x: 0.25, y: 0.8 }, natural, { width: 400, height: 500 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(400);
    expect(p.leftPct).toBeCloseTo(25);
    expect(p.visible).toBe(true);
  });

  it('accounts for letterboxing with object-fit: contain', () => {
    // 800x500 container: image scaled to 400x500, centred → 200px offset each side
    const box = computeRenderedBox(natural, { width: 800, height: 500 }, 'contain');
    expect(box).toMatchObject({ width: 400, height: 500, offsetX: 200, offsetY: 0 });
    const p = mapAnchor({ x: 0, y: 0 }, natural, { width: 800, height: 500 }, 'contain');
    expect(p.x).toBeCloseTo(200);
  });

  it('accounts for cropping with object-fit: cover and object-position', () => {
    // 400x400 container, image covers at 400x500, top aligned (position y=0) → no vertical offset
    const top = computeRenderedBox(natural, { width: 400, height: 400 }, 'cover', { x: 0.5, y: 0 });
    expect(top.offsetY).toBe(0);
    const bottom = computeRenderedBox(natural, { width: 400, height: 400 }, 'cover', { x: 0.5, y: 1 });
    expect(bottom.offsetY).toBe(-100);
    const cropped = mapAnchor({ x: 0.5, y: 0.95 }, natural, { width: 400, height: 400 }, 'cover', { x: 0.5, y: 0 });
    expect(cropped.visible).toBe(false);
  });

  it('clamps to the safe inset so markers never leave the viewport', () => {
    const p = mapAnchor({ x: 0, y: 1 }, natural, { width: 400, height: 500 }, 'contain', undefined, 22);
    expect(p.x).toBe(22);
    expect(p.y).toBe(478);
  });

  it('round-trips a point back to a normalized anchor', () => {
    const box = computeRenderedBox(natural, { width: 800, height: 500 }, 'contain');
    expect(pointToAnchor({ x: 400, y: 250 }, box)).toEqual({ x: 0.5, y: 0.5 });
    expect(pointToAnchor({ x: -50, y: 9999 }, box)).toEqual({ x: 0, y: 1 });
  });

  it('detects overlapping markers', () => {
    expect(markersOverlap([{ x: 0, y: 0 }, { x: 10, y: 10 }], 44)).toBe(true);
    expect(markersOverlap([{ x: 0, y: 0 }, { x: 100, y: 0 }], 44)).toBe(false);
  });

  it('returns an empty box for zero sizes', () => {
    expect(computeRenderedBox({ width: 0, height: 0 }, { width: 10, height: 10 }).width).toBe(0);
  });
});

describe('roadmap progress', () => {
  it('calculates bounded progress', () => {
    expect(roadmapProgress(3, 6)).toBe(0.5);
    expect(roadmapProgress(9, 6)).toBe(1);
    expect(roadmapProgress(1, 0)).toBe(0);
  });
  it('formats labels and steps', () => {
    expect(progressLabel(0, 5)).toEqual({ current: 1, total: 5 });
    expect(progressLabel(10, 5)).toEqual({ current: 5, total: 5 });
    expect(stepIndex(0, 3, -1)).toBeNull();
    expect(stepIndex(1, 3, 1)).toBe(2);
    expect(stepIndex(2, 3, 1)).toBeNull();
  });
  it('picks the most visible milestone', () => {
    expect(pickActiveIndex([0, 0.4, 0.9, 0.1], 0)).toBe(2);
    expect(pickActiveIndex([0, 0, 0], 1)).toBe(1);
    expect(pickActiveIndex([0.5, 0.5], 0)).toBe(0);
  });
});

describe('content ordering', () => {
  it('sorts by order with a stable tie-break', () => {
    const sorted = sortByOrder([
      { id: 'b', order: 2 },
      { id: 'a', order: 2 },
      { id: 'c', order: 1 },
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('normalizes a reorder request', () => {
    expect(normalizeOrder(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      { id: 'c', order: 1 },
      { id: 'a', order: 2 },
      { id: 'b', order: 3 },
    ]);
    expect(() => normalizeOrder(['a', 'b'], ['a'])).toThrow();
    expect(() => normalizeOrder(['a', 'b'], ['a', 'a'])).toThrow();
    expect(() => normalizeOrder(['a', 'b'], ['a', 'x'])).toThrow();
  });
});

describe('feedback validation', () => {
  it('accepts a minimal valid payload', () => {
    const r = feedbackInputSchema.parse({ pillar: 'midnimo', response: 'yes' });
    expect(r.suggestion).toBeUndefined();
  });
  it('trims and strips control characters', () => {
    const r = feedbackInputSchema.parse({ pillar: 'hoggaan', response: 'no', suggestion: '  hi\u0000 there  ' });
    expect(r.suggestion).toBe('hi there');
  });
  it('turns whitespace-only suggestions into undefined', () => {
    expect(feedbackInputSchema.parse({ pillar: 'hoggaan', response: 'no', suggestion: '   ' }).suggestion).toBeUndefined();
  });
  it('rejects bad input, unknown keys, long text and honeypot', () => {
    expect(feedbackInputSchema.safeParse({ pillar: 'x', response: 'yes' }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ pillar: 'midnimo', response: 'maybe' }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ pillar: 'midnimo', response: 'yes', email: 'a@b.c' }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ pillar: 'midnimo', response: 'yes', suggestion: 'x'.repeat(1001) }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ pillar: 'midnimo', response: 'yes', website: 'spam' }).success).toBe(false);
  });
  it('validates analytics events strictly', () => {
    expect(analyticsEventSchema.safeParse({ type: 'page_view', route: '/vision', sid: 'abcdefghijklmnop' }).success).toBe(true);
    expect(analyticsEventSchema.safeParse({ type: 'page_view', route: 'javascript:alert(1)', sid: 'abcdefghijklmnop' }).success).toBe(false);
    expect(analyticsEventSchema.safeParse({ type: 'hack', route: '/', sid: 'abcdefghijklmnop' }).success).toBe(false);
  });
  it('rejects mass assignment on candidate updates', () => {
    expect(candidateUpdateSchema.safeParse({ name: 'X', publishedVersion: 9 }).success).toBe(false);
  });
  it('enforces the admin password policy', () => {
    expect(createAdminSchema.safeParse({ username: 'ed', role: 'editor', password: 'Short1' }).success).toBe(false);
    expect(createAdminSchema.safeParse({ username: 'editor1', role: 'editor', password: 'LongEnough123' }).success).toBe(true);
  });
});

describe('permissions', () => {
  it('enforces role capabilities', () => {
    expect(hasPermission('owner', 'users:manage')).toBe(true);
    expect(hasPermission('editor', 'content:write')).toBe(true);
    expect(hasPermission('editor', 'content:publish')).toBe(false);
    expect(hasPermission('reviewer', 'feedback:moderate')).toBe(true);
    expect(hasPermission('reviewer', 'content:write')).toBe(false);
    expect(hasPermission(null, 'content:read')).toBe(false);
  });
});

describe('analytics aggregation', () => {
  it('summarizes feedback with a denominator', () => {
    expect(summarizeFeedback(84, 36)).toEqual({ total: 120, yes: 84, no: 36, positivePct: 70 });
    expect(summarizeFeedback(0, 0).positivePct).toBeNull();
  });
  it('computes capped completion rates', () => {
    expect(completionRate(200, 50)).toBe(25);
    expect(completionRate(0, 5)).toBeNull();
    expect(completionRate(10, 20)).toBe(100);
  });
  it('escapes CSV and neutralises formulas', () => {
    expect(csvCell('=SUM(A1)')).toBe(`"'=SUM(A1)"`);
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('""');
  });
});

describe('URL generation', () => {
  it('builds routes and absolute URLs', () => {
    expect(ROUTES.roadmap('waxbarasho')).toBe('/roadmap/waxbarasho');
    expect(absoluteUrl('https://example.org', '/roadmap/midnimo')).toBe('https://example.org/roadmap/midnimo');
    expect(absoluteUrl('https://example.org/', 'privacy')).toBe('https://example.org/privacy');
    expect(() => absoluteUrl('ftp://x', '/')).toThrow();
  });
  it('validates media keys against traversal', () => {
    expect(mediaUrl('0b0a-12cd-w480.webp')).toBe('/media/0b0a-12cd-w480.webp');
    expect(() => mediaUrl('../../etc/passwd')).toThrow();
  });
  it('lists the other pillars', () => {
    expect(otherPillars('midnimo')).toEqual(['waxbarasho', 'hoggaan']);
  });
});

describe('date filtering', () => {
  const now = new Date('2026-11-10T15:00:00Z');
  it('defaults to the last 30 days', () => {
    const r = resolveDateRange({}, now);
    expect(r.from).toBe('2026-10-12');
    expect(r.to).toBe('2026-11-10');
    expect(r.days).toBe(30);
    expect(r.endExclusive.toISOString()).toBe('2026-11-11T00:00:00.000Z');
  });
  it('swaps reversed ranges and caps long spans', () => {
    expect(resolveDateRange({ from: '2026-11-05', to: '2026-11-01' }, now).from).toBe('2026-11-01');
    expect(resolveDateRange({ from: '2020-01-01', to: '2026-11-10' }, now, 30, 90).days).toBe(90);
  });
  it('enumerates days and ISO weeks', () => {
    const r = resolveDateRange({ from: '2026-11-08', to: '2026-11-10' }, now);
    expect(enumerateDays(r)).toEqual(['2026-11-08', '2026-11-09', '2026-11-10']);
    expect(isoWeekKey('2026-11-10')).toBe('2026-W46');
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
  });
});
