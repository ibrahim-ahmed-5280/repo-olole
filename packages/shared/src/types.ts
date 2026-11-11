import type {
  FeedbackResponse,
  IconName,
  MilestoneStatus,
  ModerationStatus,
  PillarSlug,
  PillarTheme,
  Role,
} from './constants';
import type { Anchor, HotspotAnchors } from './schemas';

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: { page?: number; pageSize?: number; total?: number };
}

export interface ApiFailure {
  ok: false;
  error: { code: string; message: string; details?: unknown; requestId?: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface ImageVariantDTO {
  width: number;
  url: string;
  format: 'webp' | 'avif' | 'jpeg' | 'png';
}

export interface MediaAssetDTO {
  id: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  altText: string;
  variants: ImageVariantDTO[];
  bytes: number;
  createdAt: string;
}

export interface PublicImage {
  url: string;
  width: number;
  height: number;
  altText: string;
  variants: ImageVariantDTO[];
}

export interface CandidateDTO {
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
  portrait: PublicImage | null;
  /** Face centre on the intro portrait (0–1), used to place the mystery "?". */
  portraitFocal: Anchor;
  pose: {
    image: PublicImage | null;
    isPlaceholder: boolean;
    focal: Anchor;
    anchors: HotspotAnchors;
  };
  version: number | null;
  publishedAt: string | null;
}

export interface MilestoneDTO {
  id: string;
  title: string;
  summary: string;
  description: string;
  problem: string;
  solution: string;
  implementation: string;
  expectedBenefit: string;
  timeframe: string;
  icon: IconName;
  illustration: PublicImage | null;
  order: number;
  status: MilestoneStatus;
  isExample: boolean;
}

export interface PillarDTO {
  slug: PillarSlug;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  conclusion: string;
  icon: IconName;
  theme: PillarTheme;
  order: number;
  milestoneCount: number;
}

export interface RoadmapDTO extends PillarDTO {
  milestones: MilestoneDTO[];
  version: number | null;
  publishedAt: string | null;
}

export interface SiteSettingsDTO {
  branding: { siteName: string; tagline: string; campaignContext: string };
  animationsEnabled: boolean;
  introEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  socialLinks: Array<{ label: string; url: string }>;
  privacyNotice: string;
  publishedAt: string | null;
}

export interface AdminUserDTO {
  id: string;
  username: string;
  email?: string;
  role: Role;
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface FeedbackDTO {
  id: string;
  pillar: PillarSlug;
  response: FeedbackResponse;
  suggestion: string | null;
  moderationStatus: ModerationStatus;
  reviewNote: string | null;
  createdAt: string;
}

export interface AnalyticsSummaryDTO {
  range: { from: string; to: string; days: number };
  totals: { pageViews: number; sessions: number; roadmapViews: number; completions: number; feedback: number };
  daily: Array<{ date: string; pageViews: number; sessions: number; feedback: number }>;
  weekly: Array<{ week: string; pageViews: number; sessions: number }>;
  roadmaps: Array<{
    pillar: PillarSlug;
    views: number;
    completions: number;
    completionRate: number | null;
    hotspotClicks: number;
  }>;
  topMilestones: Array<{ milestoneId: string; title: string; pillar: PillarSlug | null; views: number }>;
  feedback: Array<{ pillar: PillarSlug; total: number; yes: number; no: number; positivePct: number | null }>;
  events: Array<{ type: string; count: number }>;
  methodology: string;
}
