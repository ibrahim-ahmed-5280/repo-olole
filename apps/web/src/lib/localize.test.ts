import { describe, expect, it } from 'vitest';
import type { MilestoneDTO, RoadmapDTO, SiteSettingsDTO } from '@reveal/shared';
import { localizeRoadmap, localizeSettings } from './localize';

const milestone: MilestoneDTO = {
  id: 'm1', title: 'Isla-xisaabtan', summary: 'SO summary', description: '', problem: 'SO problem', solution: 'SO solution',
  implementation: 'SO steps', expectedBenefit: 'SO benefit', timeframe: '', icon: 'scale', illustration: null, order: 1,
  status: 'active', isExample: false,
  en: { title: 'Accountability', summary: 'EN summary', problem: '   ' },
};
const roadmap: RoadmapDTO = {
  slug: 'hoggaan', name: 'HOGGAAN', subtitle: 'Tiirka 3aad', tagline: 'SO tagline', description: 'SO description', conclusion: 'SO end',
  icon: 'compass', theme: 'leadership', order: 3, milestoneCount: 1, milestones: [milestone], version: 1, publishedAt: null,
  en: { name: 'LEADERSHIP', subtitle: 'Pillar 3' },
};

describe('content localisation', () => {
  it('keeps Somali content untouched in Somali mode', () => {
    expect(localizeRoadmap(roadmap, 'so')).toBe(roadmap);
  });

  it('uses English fields in English mode and falls back to Somali for empty ones', () => {
    const r = localizeRoadmap(roadmap, 'en');
    expect(r.name).toBe('LEADERSHIP');
    expect(r.subtitle).toBe('Pillar 3');
    expect(r.tagline).toBe('SO tagline'); // no English → Somali fallback, never blank
    expect(r.milestones[0]!.title).toBe('Accountability');
    expect(r.milestones[0]!.summary).toBe('EN summary');
    expect(r.milestones[0]!.problem).toBe('SO problem'); // whitespace-only English is ignored
    expect(r.theme).toBe('leadership'); // non-text fields are never touched
  });

  it('localises site branding and privacy notice', () => {
    const s: SiteSettingsDTO = {
      branding: { siteName: 'THE REVEAL', tagline: 'Daah-fur Aragtida', campaignContext: 'SO context' },
      animationsEnabled: true, introEnabled: true, maintenanceMode: false, maintenanceMessage: 'SO', socialLinks: [],
      privacyNotice: 'SO privacy', publishedAt: null,
      en: { tagline: 'Discover the Vision', privacyNotice: 'EN privacy' },
    };
    const out = localizeSettings(s, 'en');
    expect(out.branding).toEqual({ siteName: 'THE REVEAL', tagline: 'Discover the Vision', campaignContext: 'SO context' });
    expect(out.privacyNotice).toBe('EN privacy');
    expect(out.maintenanceMessage).toBe('SO');
  });
});
