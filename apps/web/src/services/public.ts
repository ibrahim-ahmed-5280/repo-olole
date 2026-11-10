import { useMutation, useQuery } from '@tanstack/react-query';
import type { CandidateDTO, FeedbackInput, PillarDTO, PillarSlug, RoadmapDTO, SiteSettingsDTO } from '@reveal/shared';
import { api } from '../lib/api';

export const publicKeys = {
  site: ['public', 'site'] as const,
  candidate: ['public', 'candidate'] as const,
  pillars: ['public', 'pillars'] as const,
  roadmap: (slug: PillarSlug) => ['public', 'roadmap', slug] as const,
};

export const useSite = () =>
  useQuery({ queryKey: publicKeys.site, queryFn: ({ signal }) => api.get<SiteSettingsDTO>('/site', signal), staleTime: 60_000 });

export const useCandidate = () =>
  useQuery({ queryKey: publicKeys.candidate, queryFn: ({ signal }) => api.get<CandidateDTO>('/candidate', signal), staleTime: 60_000 });

export const usePillars = () =>
  useQuery({ queryKey: publicKeys.pillars, queryFn: ({ signal }) => api.get<PillarDTO[]>('/pillars', signal), staleTime: 60_000 });

export const useRoadmap = (slug: PillarSlug) =>
  useQuery({ queryKey: publicKeys.roadmap(slug), queryFn: ({ signal }) => api.get<RoadmapDTO>(`/pillars/${slug}`, signal), staleTime: 60_000 });

export const useSubmitFeedback = () =>
  useMutation({ mutationFn: (input: FeedbackInput) => api.post<{ received: boolean }>('/feedback', input) });
