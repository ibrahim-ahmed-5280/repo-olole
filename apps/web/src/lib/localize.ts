import type { CandidateDTO, MilestoneDTO, PillarDTO, RoadmapDTO, SiteSettingsDTO } from '@reveal/shared';
import type { Locale } from '../i18n';

/**
 * Centralised content localisation. The CMS stores Somali as the primary language and optional English
 * translations under `en`. In English mode every non-empty English field replaces its Somali counterpart;
 * an empty English field falls back to Somali so nothing ever shows blank.
 */
function overlay<T extends object>(base: T, en: object | undefined): T {
  if (!en) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(en)) {
    if (typeof v === 'string' ? v.trim() !== '' : Array.isArray(v) ? v.length > 0 : false) out[k] = v;
  }
  return out as T;
}

export const localizeCandidate = (c: CandidateDTO, l: Locale): CandidateDTO => (l === 'en' ? overlay(c, c.en) : c);
export const localizePillar = <P extends PillarDTO>(p: P, l: Locale): P => (l === 'en' ? overlay(p, p.en) : p);
export const localizeMilestone = (m: MilestoneDTO, l: Locale): MilestoneDTO => (l === 'en' ? overlay(m, m.en) : m);
export const localizeRoadmap = (r: RoadmapDTO, l: Locale): RoadmapDTO =>
  l === 'en' ? { ...localizePillar(r, l), milestones: r.milestones.map((m) => localizeMilestone(m, l)) } : r;
export function localizeSettings(s: SiteSettingsDTO, l: Locale): SiteSettingsDTO {
  if (l !== 'en' || !s.en) return s;
  const { tagline, campaignContext, maintenanceMessage, privacyNotice } = s.en;
  return {
    ...overlay(s, { maintenanceMessage, privacyNotice }),
    branding: overlay(s.branding, { tagline, campaignContext }),
  };
}
