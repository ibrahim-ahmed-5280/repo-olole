import { PILLAR_SLUGS, type PillarSlug } from './constants';

export const ROUTES = {
  intro: '/',
  vision: '/vision',
  about: '/vision?panel=about',
  privacy: '/privacy',
  roadmap: (slug: PillarSlug) => `/roadmap/${slug}`,
} as const;

export function isPillarSlug(value: unknown): value is PillarSlug {
  return typeof value === 'string' && (PILLAR_SLUGS as readonly string[]).includes(value);
}

/** Joins an origin and a path without duplicating slashes. Throws for non-http(s) origins. */
export function absoluteUrl(origin: string, path: string): string {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, origin.endsWith('/') ? origin : `${origin}/`);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Invalid origin');
  return url.toString();
}

/** Media URL for a stored asset variant. Keys are server-generated (uuid + extension) and validated here. */
export function mediaUrl(storageKey: string, base = '/media'): string {
  if (!/^[a-z0-9-]+(?:-w\d+)?\.(?:jpg|png|webp|avif)$/i.test(storageKey)) throw new Error('Invalid storage key');
  return `${base}/${storageKey}`;
}

export function otherPillars(slug: PillarSlug): PillarSlug[] {
  return PILLAR_SLUGS.filter((s) => s !== slug);
}
