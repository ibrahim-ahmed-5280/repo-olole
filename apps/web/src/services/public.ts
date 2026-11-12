import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { CandidateDTO, FeedbackInput, PillarDTO, PillarSlug, RoadmapDTO, SiteSettingsDTO } from '@reveal/shared';
import { api } from '../lib/api';
import { useI18n } from '../i18n';
import { localizeCandidate, localizePillar, localizeRoadmap, localizeSettings } from '../lib/localize';

export const publicKeys = {
  site: ['public', 'site'] as const,
  candidate: ['public', 'candidate'] as const,
  pillars: ['public', 'pillars'] as const,
  roadmap: (slug: PillarSlug) => ['public', 'roadmap', slug] as const,
};

/*
 * The public hooks return content already localised to the active language (Somali or English).
 * The raw bilingual response is cached once; switching language re-selects instantly, without a refetch.
 */

export const useSite = () => {
  const { locale } = useI18n();
  const select = useCallback((s: SiteSettingsDTO) => localizeSettings(s, locale), [locale]);
  return useQuery({ queryKey: publicKeys.site, queryFn: ({ signal }) => api.get<SiteSettingsDTO>('/site', signal), staleTime: 60_000, select });
};

export const useCandidate = () => {
  const { locale } = useI18n();
  const select = useCallback((c: CandidateDTO) => localizeCandidate(c, locale), [locale]);
  return useQuery({ queryKey: publicKeys.candidate, queryFn: ({ signal }) => api.get<CandidateDTO>('/candidate', signal), staleTime: 60_000, select });
};

export const usePillars = () => {
  const { locale } = useI18n();
  const select = useCallback((ps: PillarDTO[]) => ps.map((p) => localizePillar(p, locale)), [locale]);
  return useQuery({ queryKey: publicKeys.pillars, queryFn: ({ signal }) => api.get<PillarDTO[]>('/pillars', signal), staleTime: 60_000, select });
};

export const useRoadmap = (slug: PillarSlug) => {
  const { locale } = useI18n();
  const select = useCallback((r: RoadmapDTO) => localizeRoadmap(r, locale), [locale]);
  return useQuery({
    queryKey: publicKeys.roadmap(slug),
    queryFn: ({ signal }) => api.get<RoadmapDTO>(`/pillars/${slug}`, signal),
    staleTime: 60_000,
    select,
  });
};

export const useSubmitFeedback = () =>
  useMutation({ mutationFn: (input: FeedbackInput) => api.post<{ received: boolean }>('/feedback', input) });
