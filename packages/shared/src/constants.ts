/** Fixed campaign pillars. Slugs are part of public URLs and must stay stable. */
export const PILLAR_SLUGS = ['waxbarasho', 'midnimo', 'hoggaan'] as const;
export type PillarSlug = (typeof PILLAR_SLUGS)[number];

/** Hotspot keys on the interactive portrait. */
export const HOTSPOT_KEYS = ['education', 'unity', 'leadership', 'about'] as const;
export type HotspotKey = (typeof HOTSPOT_KEYS)[number];

export const HOTSPOT_TO_PILLAR: Record<Exclude<HotspotKey, 'about'>, PillarSlug> = {
  education: 'waxbarasho',
  unity: 'midnimo',
  leadership: 'hoggaan',
};

export const PILLAR_THEMES = ['education', 'unity', 'leadership'] as const;
export type PillarTheme = (typeof PILLAR_THEMES)[number];

/** Icon names the CMS may choose from (mapped to Lucide icons in the web app). */
export const ICON_NAMES = [
  'graduation-cap', 'book-open', 'library', 'laptop', 'code', 'lightbulb', 'users', 'handshake',
  'messages-square', 'heart-handshake', 'link', 'calendar', 'ear', 'compass', 'landmark', 'scale',
  'eye', 'clipboard-check', 'megaphone', 'bar-chart', 'flag', 'target', 'shield-check', 'sparkles',
] as const;
export type IconName = (typeof ICON_NAMES)[number];

export const ROLES = ['owner', 'editor', 'reviewer'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'content:read',
  'content:write',
  'content:publish',
  'content:request_publish',
  'media:write',
  'feedback:read',
  'feedback:moderate',
  'feedback:export',
  'analytics:read',
  'settings:write',
  'users:manage',
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  editor: ['content:read', 'content:write', 'content:request_publish', 'media:write'],
  reviewer: ['feedback:read', 'feedback:moderate', 'feedback:export', 'analytics:read'],
};

export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const MODERATION_STATUSES = ['new', 'reviewed', 'hidden'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const FEEDBACK_RESPONSES = ['yes', 'no'] as const;
export type FeedbackResponse = (typeof FEEDBACK_RESPONSES)[number];

export const FEEDBACK_SUGGESTION_MAX = 1000;

export const MILESTONE_STATUSES = ['active', 'hidden'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

/** Allowed analytics events. Keep in sync with docs/ANALYTICS.md. */
export const ANALYTICS_EVENTS = [
  'page_view',
  'intro_reveal',
  'intro_skip',
  'hotspot_click',
  'about_open',
  'roadmap_view',
  'milestone_view',
  'roadmap_complete',
  'feedback_submit',
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENTS)[number];

export const CONTENT_ENTITY_TYPES = ['candidate', 'pillar', 'settings'] as const;
export type ContentEntityType = (typeof CONTENT_ENTITY_TYPES)[number];

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export const IMAGE_VARIANT_WIDTHS = [480, 960, 1440] as const;

export const PRIVACY_DISCLAIMER_EN =
  'This data represents feedback from participating website visitors and is not a representative election poll.';
