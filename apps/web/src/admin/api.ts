import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type {
  AdminUserDTO,
  AnalyticsSummaryDTO,
  CandidateDTO,
  FeedbackDTO,
  MediaAssetDTO,
  MilestoneDTO,
  Permission,
  PillarSlug,
  RoadmapDTO,
  Role,
  SiteSettingsDTO,
} from '@reveal/shared';
import { api, apiRequest } from '../lib/api';

export interface Me {
  user: { id: string; username: string; role: Role };
  permissions: Permission[];
}

export interface PublishState {
  publishedVersion: number | null;
  publishedAt: string | null;
  draftUpdatedAt: string | null;
  reviewRequestedAt: string | null;
  hasUnpublishedChanges: boolean;
}

export type Anchor = { x: number; y: number };
export interface CandidateDraft {
  id: string;
  name: string;
  title: string;
  introduction: string;
  biography: string;
  education: string[];
  experience: string[];
  skills: string[];
  motivation: string;
  vision: string;
  achievements: string[];
  portraitAssetId: string | null;
  pose: { assetId: string | null; isPlaceholder: boolean; focal: Anchor; anchors: Record<'education' | 'unity' | 'leadership' | 'about', Anchor> };
}

export interface PillarDraft {
  id: string;
  slug: PillarSlug;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  conclusion: string;
  icon: string;
  theme: string;
  order: number;
}

export interface MilestoneDraft extends Omit<MilestoneDTO, 'illustration'> {
  illustrationAssetId: string | null;
}

export const adminKeys = {
  me: ['admin', 'me'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  candidate: ['admin', 'candidate'] as const,
  pillars: ['admin', 'pillars'] as const,
  pillar: (slug: string) => ['admin', 'pillar', slug] as const,
  versions: (type: string, id: string) => ['admin', 'versions', type, id] as const,
  feedback: (q: string) => ['admin', 'feedback', q] as const,
  analytics: (q: string) => ['admin', 'analytics', q] as const,
  media: ['admin', 'media'] as const,
  settings: ['admin', 'settings'] as const,
  users: ['admin', 'users'] as const,
  sessions: ['admin', 'sessions'] as const,
  audit: (q: string) => ['admin', 'audit', q] as const,
};

export const useMe = () => useQuery({ queryKey: adminKeys.me, queryFn: () => api.get<Me>('/admin/auth/me'), retry: false, staleTime: 60_000 });

export const useDashboard = () => useQuery({ queryKey: adminKeys.dashboard, queryFn: () => api.get<DashboardData>('/admin/dashboard') });

export interface DashboardData {
  role: Role;
  analytics?: Pick<AnalyticsSummaryDTO, 'range' | 'totals' | 'daily' | 'roadmaps' | 'feedback' | 'methodology'>;
  feedback?: { newCount: number; total: number; recent: Array<{ id: string; pillar: PillarSlug; response: 'yes' | 'no'; suggestion: string | null; createdAt: string }> };
  content?: { candidate: PublishState; pillars: Array<{ slug: PillarSlug; name: string; state: PublishState }> };
}

export const useCandidateDraft = () =>
  useQuery({ queryKey: adminKeys.candidate, queryFn: () => api.get<{ draft: CandidateDraft; preview: CandidateDTO; state: PublishState }>('/admin/candidate') });

export const useAdminPillars = () =>
  useQuery({
    queryKey: adminKeys.pillars,
    queryFn: () => api.get<Array<PillarDraft & { milestoneCount: number; activeMilestoneCount: number; exampleCount: number; state: PublishState }>>('/admin/pillars'),
  });

export const usePillarDraft = (slug: PillarSlug) =>
  useQuery({ queryKey: adminKeys.pillar(slug), queryFn: () => api.get<{ pillar: PillarDraft; milestones: MilestoneDraft[]; state: PublishState }>(`/admin/pillars/${slug}`) });

export const usePreviewRoadmap = (slug: PillarSlug) =>
  useQuery({ queryKey: ['admin', 'preview', slug], queryFn: () => api.get<RoadmapDTO>(`/admin/preview/pillars/${slug}`) });

export const usePreviewCandidate = () => useQuery({ queryKey: ['admin', 'preview', 'candidate'], queryFn: () => api.get<CandidateDTO>('/admin/preview/candidate') });

export const useVersions = (entityType: string, entityId: string) =>
  useQuery({
    queryKey: adminKeys.versions(entityType, entityId),
    queryFn: () => api.get<Array<{ id: string; version: number; publishedAt: string; publishedBy: string; note: string }>>(`/admin/versions?entityType=${entityType}&entityId=${entityId}`),
  });

export const useMedia = () => useQuery({ queryKey: adminKeys.media, queryFn: () => api.get<MediaAssetDTO[]>('/admin/media') });

export const useSettingsDraft = () => useQuery({ queryKey: adminKeys.settings, queryFn: () => api.get<{ draft: SiteSettingsDTO; state: PublishState }>('/admin/settings') });

export const useFeedback = (query: string) =>
  useQuery({ queryKey: adminKeys.feedback(query), queryFn: () => api.getPaged<FeedbackDTO[]>(`/admin/feedback?${query}`), placeholderData: (prev) => prev });

export const useAnalytics = (query: string) =>
  useQuery({ queryKey: adminKeys.analytics(query), queryFn: () => api.get<AnalyticsSummaryDTO>(`/admin/analytics?${query}`), placeholderData: (prev) => prev });

export const useUsers = (enabled: boolean) => useQuery({ queryKey: adminKeys.users, queryFn: () => api.get<AdminUserDTO[]>('/admin/users'), enabled });

export const useSessions = () =>
  useQuery({
    queryKey: adminKeys.sessions,
    queryFn: () => api.get<Array<{ id: string; createdAt: string | null; lastSeenAt: string; expiresAt: string; userAgent: string; current: boolean }>>('/admin/auth/sessions'),
  });

export const useAudit = (query: string) =>
  useQuery({
    queryKey: adminKeys.audit(query),
    queryFn: () => api.getPaged<Array<{ id: string; actor: string; action: string; entityType: string; entityId: string | null; timestamp: string; metadata: Record<string, unknown> }>>(`/admin/audit-logs?${query}`),
    placeholderData: (prev) => prev,
  });

/** Mutation helper that invalidates the given query keys on success. */
export function useAdminMutation<TVars, TData = unknown>(fn: (vars: TVars) => Promise<TData>, invalidate: QueryKey[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(invalidate.map((k) => qc.invalidateQueries({ queryKey: k })));
      await qc.invalidateQueries({ queryKey: ['public'] });
      await qc.invalidateQueries({ queryKey: adminKeys.dashboard });
    },
  });
}

export async function uploadMedia(file: File, altText: string) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('altText', altText);
  return (await apiRequest<MediaAssetDTO>('/admin/media', { method: 'POST', body: fd })).data;
}
