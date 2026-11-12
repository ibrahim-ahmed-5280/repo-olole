import { z } from 'zod';
import {
  ANALYTICS_EVENTS,
  FEEDBACK_RESPONSES,
  FEEDBACK_SUGGESTION_MAX,
  HOTSPOT_KEYS,
  ICON_NAMES,
  MILESTONE_STATUSES,
  MODERATION_STATUSES,
  PILLAR_SLUGS,
  PILLAR_THEMES,
  ROLES,
  CONTENT_ENTITY_TYPES,
} from './constants';

/** Removes ASCII control chars (except tab/newline) and trims. Rendering is always escaped by React. */
export function cleanText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

const text = (max: number) => z.string().max(max).transform(cleanText);
const requiredText = (max: number) =>
  z.string().transform(cleanText).pipe(z.string().min(1, 'Required').max(max));

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
export const pillarSlugSchema = z.enum(PILLAR_SLUGS);

// ───────────────────────── Public inputs ─────────────────────────

export const feedbackInputSchema = z
  .object({
    pillar: pillarSlugSchema,
    response: z.enum(FEEDBACK_RESPONSES),
    suggestion: z
      .string()
      .max(FEEDBACK_SUGGESTION_MAX, `Maximum ${FEEDBACK_SUGGESTION_MAX} characters`)
      .optional()
      .transform((v) => (v ? cleanText(v) : undefined))
      .transform((v) => (v ? v : undefined)),
    /** Honeypot field — must be empty. Bots that fill every input are silently dropped. */
    website: z.string().max(0).optional(),
  })
  .strict();
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export const analyticsEventSchema = z
  .object({
    type: z.enum(ANALYTICS_EVENTS),
    route: z
      .string()
      .max(120)
      .regex(/^\/[a-z0-9\-/]*$/i, 'Invalid route'),
    pillar: pillarSlugSchema.optional(),
    milestoneId: objectIdSchema.optional(),
    target: z.enum(HOTSPOT_KEYS).optional(),
    /** Random per-tab session token generated in sessionStorage. Never stored raw. */
    sid: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  })
  .strict();
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

// ───────────────────────── Admin inputs ─────────────────────────

export const loginSchema = z
  .object({
    username: z.string().trim().min(3).max(64),
    password: z.string().min(1).max(256),
  })
  .strict();

export const passwordPolicy = z
  .string()
  .min(12, 'At least 12 characters')
  .max(256)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), {
    message: 'Use upper-case, lower-case and a number',
  });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(256), newPassword: passwordPolicy })
  .strict();

export const createAdminSchema = z
  .object({
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, '3–32 chars: a-z 0-9 . _ -'),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    role: z.enum(ROLES),
    password: passwordPolicy,
  })
  .strict();

export const updateAdminSchema = z
  .object({ role: z.enum(ROLES).optional(), status: z.enum(['active', 'disabled']).optional() })
  .strict();

export const anchorSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type Anchor = z.infer<typeof anchorSchema>;

export const hotspotAnchorsSchema = z.object({
  education: anchorSchema,
  unity: anchorSchema,
  leadership: anchorSchema,
  about: anchorSchema,
});
export type HotspotAnchors = z.infer<typeof hotspotAnchorsSchema>;

const listOfText = (maxItems: number, maxLen: number) => z.array(requiredText(maxLen)).max(maxItems);

/*
 * English translations. Somali is the primary content language; every public text can carry an optional
 * English version under `en`. Empty English fields fall back to Somali on the public site.
 */
export const candidateEnSchema = z
  .object({
    title: text(160),
    introduction: text(600),
    biography: text(5000),
    education: listOfText(20, 300),
    experience: listOfText(20, 300),
    skills: listOfText(40, 80),
    motivation: text(2000),
    vision: text(2000),
    achievements: listOfText(20, 300),
  })
  .partial()
  .strict();
export const pillarEnSchema = z
  .object({ name: text(40), subtitle: text(80), tagline: text(160), description: text(1500), conclusion: text(1500) })
  .partial()
  .strict();
export const milestoneEnSchema = z
  .object({
    title: text(140),
    summary: text(400),
    description: text(3000),
    problem: text(1500),
    solution: text(1500),
    implementation: text(1500),
    expectedBenefit: text(1500),
    timeframe: text(80),
  })
  .partial()
  .strict();
export const settingsEnSchema = z
  .object({ tagline: text(160), campaignContext: text(300), maintenanceMessage: text(400), privacyNotice: text(8000) })
  .partial()
  .strict();

export const candidateUpdateSchema = z
  .object({
    name: requiredText(120),
    title: text(160),
    introduction: text(600),
    biography: text(5000),
    education: listOfText(20, 300),
    experience: listOfText(20, 300),
    skills: listOfText(40, 80),
    motivation: text(2000),
    vision: text(2000),
    achievements: listOfText(20, 300),
    portraitAssetId: objectIdSchema.nullable(),
    /** Face centre on the intro portrait (normalized) — where the mystery "?" sits. */
    portraitFocal: anchorSchema,
    pose: z.object({
      assetId: objectIdSchema.nullable(),
      isPlaceholder: z.boolean(),
      focal: anchorSchema,
      anchors: hotspotAnchorsSchema,
    }),
    en: candidateEnSchema,
  })
  .partial()
  .strict();
export type CandidateUpdate = z.infer<typeof candidateUpdateSchema>;

export const pillarUpdateSchema = z
  .object({
    name: requiredText(40),
    subtitle: text(80),
    tagline: text(160),
    description: text(1500),
    conclusion: text(1500),
    icon: z.enum(ICON_NAMES),
    theme: z.enum(PILLAR_THEMES),
    en: pillarEnSchema,
  })
  .partial()
  .strict();

export const milestoneInputSchema = z
  .object({
    pillar: pillarSlugSchema,
    title: requiredText(140),
    summary: text(400).default(''),
    description: text(3000).default(''),
    problem: text(1500).default(''),
    solution: text(1500).default(''),
    implementation: text(1500).default(''),
    expectedBenefit: text(1500).default(''),
    timeframe: text(80).default(''),
    icon: z.enum(ICON_NAMES),
    illustrationAssetId: objectIdSchema.nullable().optional(),
    status: z.enum(MILESTONE_STATUSES).default('active'),
    isExample: z.boolean().default(false),
    en: milestoneEnSchema.optional(),
  })
  .strict();
export type MilestoneInput = z.infer<typeof milestoneInputSchema>;

export const milestoneUpdateSchema = milestoneInputSchema.omit({ pillar: true }).partial().strict();

export const reorderSchema = z.object({ ids: z.array(objectIdSchema).min(1).max(100) }).strict();

export const settingsUpdateSchema = z
  .object({
    branding: z
      .object({ siteName: requiredText(80), tagline: text(160), campaignContext: text(300) })
      .strict(),
    animationsEnabled: z.boolean(),
    introEnabled: z.boolean(),
    maintenanceMode: z.boolean(),
    maintenanceMessage: text(400),
    socialLinks: z
      .array(
        z
          .object({
            label: requiredText(40),
            url: z
              .string()
              .url()
              .max(300)
              .refine((u) => /^https:\/\//i.test(u), 'Must be https'),
          })
          .strict(),
      )
      .max(10),
    privacyNotice: text(8000),
    en: settingsEnSchema,
  })
  .partial()
  .strict();

export const feedbackModerationSchema = z
  .object({
    moderationStatus: z.enum(MODERATION_STATUSES).optional(),
    reviewNote: text(1000).optional(),
  })
  .strict();

export const mediaUpdateSchema = z.object({ altText: text(300) }).strict();

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const dateRangeQuerySchema = z.object({ from: dateString.optional(), to: dateString.optional() });

export const feedbackQuerySchema = dateRangeQuerySchema.extend({
  pillar: pillarSlugSchema.optional(),
  response: z.enum(FEEDBACK_RESPONSES).optional(),
  status: z.enum(MODERATION_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const auditQuerySchema = dateRangeQuerySchema.extend({
  action: z.string().trim().max(60).optional(),
  entityType: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export const versionsQuerySchema = z.object({
  entityType: z.enum(CONTENT_ENTITY_TYPES),
  entityId: z.string().min(1).max(40),
});
