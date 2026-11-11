import { Schema, model, Types } from 'mongoose';
import {
  CONTENT_ENTITY_TYPES,
  ICON_NAMES,
  MILESTONE_STATUSES,
  PILLAR_SLUGS,
  PILLAR_THEMES,
} from '@reveal/shared';

/**
 * Publishing model
 * ────────────────
 * The documents in candidate_profiles / pillars / milestones / website_settings are the
 * editable DRAFT ("working copy"). Publishing writes an immutable snapshot to content_versions
 * and points `publishedVersion` at it. The public API only ever reads snapshots, so drafts are
 * never visible to visitors until an owner publishes them.
 */
const publishFields = {
  publishedVersion: { type: Number, default: null },
  publishedAt: { type: Date, default: null },
  draftUpdatedAt: { type: Date, default: () => new Date() },
  reviewRequestedAt: { type: Date, default: null },
  reviewRequestedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
};

const anchor = { x: { type: Number, min: 0, max: 1 }, y: { type: Number, min: 0, max: 1 } };

const candidateSchema = new Schema(
  {
    key: { type: String, default: 'main' },
    name: { type: String, required: true, maxlength: 120 },
    title: { type: String, default: '', maxlength: 160 },
    introduction: { type: String, default: '', maxlength: 600 },
    biography: { type: String, default: '', maxlength: 5000 },
    education: { type: [String], default: [] },
    experience: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    motivation: { type: String, default: '', maxlength: 2000 },
    vision: { type: String, default: '', maxlength: 2000 },
    achievements: { type: [String], default: [] },
    portraitAssetId: { type: Schema.Types.ObjectId, ref: 'MediaAsset', default: null },
    portraitFocal: anchor,
    pose: {
      assetId: { type: Schema.Types.ObjectId, ref: 'MediaAsset', default: null },
      isPlaceholder: { type: Boolean, default: true },
      focal: anchor,
      anchors: { education: anchor, unity: anchor, leadership: anchor, about: anchor },
    },
    ...publishFields,
  },
  { timestamps: true, collection: 'candidate_profiles' },
);
candidateSchema.index({ key: 1 }, { unique: true });
export const CandidateProfile = model('CandidateProfile', candidateSchema);

const pillarSchema = new Schema(
  {
    slug: { type: String, enum: PILLAR_SLUGS, required: true },
    name: { type: String, required: true, maxlength: 40 },
    subtitle: { type: String, default: '', maxlength: 80 },
    tagline: { type: String, default: '', maxlength: 160 },
    description: { type: String, default: '', maxlength: 1500 },
    conclusion: { type: String, default: '', maxlength: 1500 },
    theme: { type: String, enum: PILLAR_THEMES, required: true },
    icon: { type: String, enum: ICON_NAMES, required: true },
    order: { type: Number, required: true },
    ...publishFields,
  },
  { timestamps: true, collection: 'pillars' },
);
pillarSchema.index({ slug: 1 }, { unique: true });
pillarSchema.index({ order: 1 });
export const Pillar = model('Pillar', pillarSchema);

const milestoneSchema = new Schema(
  {
    pillarId: { type: Schema.Types.ObjectId, ref: 'Pillar', required: true },
    title: { type: String, required: true, maxlength: 140 },
    summary: { type: String, default: '', maxlength: 400 },
    description: { type: String, default: '', maxlength: 3000 },
    problem: { type: String, default: '', maxlength: 1500 },
    solution: { type: String, default: '', maxlength: 1500 },
    implementation: { type: String, default: '', maxlength: 1500 },
    expectedBenefit: { type: String, default: '', maxlength: 1500 },
    timeframe: { type: String, default: '', maxlength: 80 },
    icon: { type: String, enum: ICON_NAMES, default: 'flag' },
    illustrationAssetId: { type: Schema.Types.ObjectId, ref: 'MediaAsset', default: null },
    order: { type: Number, required: true },
    status: { type: String, enum: MILESTONE_STATUSES, default: 'active' },
    /** Marks placeholder content that has not been approved by the campaign. Shown publicly as "Tusaale". */
    isExample: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'milestones' },
);
milestoneSchema.index({ pillarId: 1, order: 1 });
export const Milestone = model('Milestone', milestoneSchema);

const settingsSchema = new Schema(
  {
    key: { type: String, default: 'main' },
    branding: {
      siteName: { type: String, default: 'THE REVEAL', maxlength: 80 },
      tagline: { type: String, default: '', maxlength: 160 },
      campaignContext: { type: String, default: '', maxlength: 300 },
    },
    animationsEnabled: { type: Boolean, default: true },
    introEnabled: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: '', maxlength: 400 },
    socialLinks: { type: [{ label: String, url: String, _id: false }], default: [] },
    privacyNotice: { type: String, default: '', maxlength: 8000 },
    ...publishFields,
  },
  { timestamps: true, collection: 'website_settings' },
);
settingsSchema.index({ key: 1 }, { unique: true });
export const WebsiteSettings = model('WebsiteSettings', settingsSchema);

const versionSchema = new Schema(
  {
    entityType: { type: String, enum: CONTENT_ENTITY_TYPES, required: true },
    entityId: { type: String, required: true },
    version: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    /** null when published by the seed/CLI (system). */
    publishedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    publishedAt: { type: Date, required: true },
    note: { type: String, maxlength: 300, default: '' },
  },
  { collection: 'content_versions', minimize: false },
);
versionSchema.index({ entityType: 1, entityId: 1, version: -1 }, { unique: true });
export const ContentVersion = model('ContentVersion', versionSchema);

export type ObjectId = Types.ObjectId;
