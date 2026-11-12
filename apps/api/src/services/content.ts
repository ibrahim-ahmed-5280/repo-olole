import { Types } from 'mongoose';
import {
  sortByOrder,
  type CandidateDTO,
  type ContentEntityType,
  type MilestoneDTO,
  type PillarDTO,
  type PillarSlug,
  type RoadmapDTO,
  type SiteSettingsDTO,
} from '@reveal/shared';
import { CandidateProfile, ContentVersion, Milestone, Pillar, WebsiteSettings } from '../models/content';
import { MediaAsset } from '../models/records';
import { ApiError, notFound } from '../lib/http';
import { toPublicImage } from './media';

const DEFAULT_ANCHORS = {
  education: { x: 0.14, y: 0.86 },
  unity: { x: 0.86, y: 0.86 },
  leadership: { x: 0.5, y: 0.96 },
  about: { x: 0.64, y: 0.74 },
};

async function imagesById(ids: Array<unknown>) {
  const valid = ids.filter((id): id is Types.ObjectId => id instanceof Types.ObjectId);
  if (valid.length === 0) return new Map<string, ReturnType<typeof toPublicImage>>();
  const assets = await MediaAsset.find({ _id: { $in: valid } }).lean();
  return new Map(assets.map((a) => [String(a._id), toPublicImage(a as never)]));
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Copies only non-empty English fields (strings trimmed, non-empty arrays); undefined when nothing is translated. */
export function cleanEn<T extends object>(raw: unknown, keys: readonly (keyof T)[]): T | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys as readonly string[]) {
    const v = src[k];
    if (typeof v === 'string' && v.trim()) out[k] = v;
    else if (Array.isArray(v) && v.length) out[k] = [...v];
  }
  return Object.keys(out).length ? (out as T) : undefined;
}
const CANDIDATE_EN_KEYS = ['title', 'introduction', 'biography', 'education', 'experience', 'skills', 'motivation', 'vision', 'achievements'] as const;
const PILLAR_EN_KEYS = ['name', 'subtitle', 'tagline', 'description', 'conclusion'] as const;
const MILESTONE_EN_KEYS = ['title', 'summary', 'description', 'problem', 'solution', 'implementation', 'expectedBenefit', 'timeframe'] as const;
const SETTINGS_EN_KEYS = ['tagline', 'campaignContext', 'maintenanceMessage', 'privacyNotice'] as const;

// ───────────────────────── Candidate ─────────────────────────

export async function getCandidateDoc() {
  const doc = await CandidateProfile.findOne({ key: 'main' });
  if (!doc) throw notFound('Candidate profile');
  return doc;
}

export async function buildCandidateDTO(doc: Awaited<ReturnType<typeof getCandidateDoc>>): Promise<CandidateDTO> {
  const imgs = await imagesById([doc.portraitAssetId, doc.pose?.assetId]);
  const anchors = doc.pose?.anchors as unknown as CandidateDTO['pose']['anchors'] | undefined;
  return {
    name: doc.name,
    title: doc.title,
    introduction: doc.introduction,
    biography: doc.biography,
    education: [...doc.education],
    experience: [...doc.experience],
    skills: [...doc.skills],
    motivation: doc.motivation,
    vision: doc.vision,
    achievements: [...doc.achievements],
    portrait: imgs.get(String(doc.portraitAssetId)) ?? null,
    portraitFocal: { x: doc.portraitFocal?.x ?? 0.5, y: doc.portraitFocal?.y ?? 0.35 },
    pose: {
      image: imgs.get(String(doc.pose?.assetId)) ?? null,
      isPlaceholder: doc.pose?.isPlaceholder ?? true,
      focal: { x: doc.pose?.focal?.x ?? 0.5, y: doc.pose?.focal?.y ?? 0.3 },
      anchors: {
        education: anchors?.education?.x != null ? anchors.education : DEFAULT_ANCHORS.education,
        unity: anchors?.unity?.x != null ? anchors.unity : DEFAULT_ANCHORS.unity,
        leadership: anchors?.leadership?.x != null ? anchors.leadership : DEFAULT_ANCHORS.leadership,
        about: anchors?.about?.x != null ? anchors.about : DEFAULT_ANCHORS.about,
      },
    },
    en: cleanEn<NonNullable<CandidateDTO['en']>>(doc.en, CANDIDATE_EN_KEYS),
    version: doc.publishedVersion ?? null,
    publishedAt: iso(doc.publishedAt),
  };
}

// ───────────────────────── Pillars / roadmaps ─────────────────────────

export async function getPillarDoc(slug: PillarSlug) {
  const pillar = await Pillar.findOne({ slug });
  if (!pillar) throw notFound('Pillar');
  return pillar;
}

type PillarDoc = Awaited<ReturnType<typeof getPillarDoc>>;
type MilestoneLean = Awaited<ReturnType<typeof listMilestones>>[number];

export async function listMilestones(pillarId: Types.ObjectId) {
  const rows = await Milestone.find({ pillarId }).lean();
  return sortByOrder(rows.map((r) => ({ ...r, id: String(r._id) })));
}

function milestoneDTO(m: MilestoneLean, imgs: Map<string, ReturnType<typeof toPublicImage>>): MilestoneDTO {
  return {
    id: String(m._id),
    title: m.title,
    summary: m.summary ?? '',
    description: m.description ?? '',
    problem: m.problem ?? '',
    solution: m.solution ?? '',
    implementation: m.implementation ?? '',
    expectedBenefit: m.expectedBenefit ?? '',
    timeframe: m.timeframe ?? '',
    icon: (m.icon ?? 'flag') as MilestoneDTO['icon'],
    illustration: imgs.get(String(m.illustrationAssetId)) ?? null,
    order: m.order,
    status: (m.status ?? 'active') as MilestoneDTO['status'],
    isExample: !!m.isExample,
    en: cleanEn<NonNullable<MilestoneDTO['en']>>(m.en, MILESTONE_EN_KEYS),
  };
}

function pillarDTO(p: PillarDoc, milestoneCount: number): PillarDTO {
  return {
    slug: p.slug as PillarSlug,
    name: p.name,
    subtitle: p.subtitle,
    tagline: p.tagline,
    description: p.description,
    conclusion: p.conclusion,
    icon: p.icon as PillarDTO['icon'],
    theme: p.theme as PillarDTO['theme'],
    order: p.order,
    milestoneCount,
    en: cleanEn<NonNullable<PillarDTO['en']>>(p.en, PILLAR_EN_KEYS),
  };
}

/** Builds the draft roadmap. `hiddenMilestones` is admin-only and stripped from public responses. */
export async function buildRoadmapDTO(p: PillarDoc): Promise<RoadmapDTO & { hiddenMilestones: MilestoneDTO[] }> {
  const all = await listMilestones(p._id);
  const imgs = await imagesById(all.map((m) => m.illustrationAssetId));
  const active = all.filter((m) => m.status === 'active').map((m) => milestoneDTO(m, imgs));
  const hidden = all.filter((m) => m.status !== 'active').map((m) => milestoneDTO(m, imgs));
  return {
    ...pillarDTO(p, active.length),
    milestones: active,
    hiddenMilestones: hidden,
    version: p.publishedVersion ?? null,
    publishedAt: iso(p.publishedAt),
  };
}

// ───────────────────────── Settings ─────────────────────────

export async function getSettingsDoc() {
  const doc = await WebsiteSettings.findOne({ key: 'main' });
  if (!doc) throw notFound('Website settings');
  return doc;
}

export function buildSettingsDTO(doc: Awaited<ReturnType<typeof getSettingsDoc>>): SiteSettingsDTO {
  return {
    branding: {
      siteName: doc.branding?.siteName ?? 'THE REVEAL',
      tagline: doc.branding?.tagline ?? '',
      campaignContext: doc.branding?.campaignContext ?? '',
    },
    animationsEnabled: doc.animationsEnabled,
    introEnabled: doc.introEnabled,
    maintenanceMode: doc.maintenanceMode,
    maintenanceMessage: doc.maintenanceMessage,
    socialLinks: doc.socialLinks.map((l) => ({ label: l.label ?? '', url: l.url ?? '' })),
    privacyNotice: doc.privacyNotice,
    en: cleanEn<NonNullable<SiteSettingsDTO['en']>>(doc.en, SETTINGS_EN_KEYS),
    publishedAt: iso(doc.publishedAt),
  };
}

// ───────────────────────── Publishing ─────────────────────────

const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_MS = 15_000;
const cacheKey = (t: ContentEntityType, id: string) => `${t}:${id}`;
export const clearPublishedCache = () => cache.clear();

async function entityDoc(entityType: ContentEntityType, entityId: string) {
  if (entityType === 'candidate') return getCandidateDoc();
  if (entityType === 'settings') return getSettingsDoc();
  return getPillarDoc(entityId as PillarSlug);
}

async function buildSnapshot(entityType: ContentEntityType, entityId: string): Promise<Record<string, unknown>> {
  if (entityType === 'candidate') return { ...(await buildCandidateDTO(await getCandidateDoc())), _raw: (await getCandidateDoc()).toObject() };
  if (entityType === 'settings') return { ...buildSettingsDTO(await getSettingsDoc()) };
  const pillar = await getPillarDoc(entityId as PillarSlug);
  const dto = await buildRoadmapDTO(pillar);
  const raw = await Milestone.find({ pillarId: pillar._id }).lean();
  return { ...dto, _rawMilestones: raw };
}

export async function publish(entityType: ContentEntityType, entityId: string, adminId: Types.ObjectId | null, note = '') {
  const doc = await entityDoc(entityType, entityId);
  const last = await ContentVersion.findOne({ entityType, entityId }).sort({ version: -1 }).select('version').lean();
  const version = (last?.version ?? 0) + 1;
  const publishedAt = new Date();
  const snapshot = await buildSnapshot(entityType, entityId);
  snapshot.version = version;
  snapshot.publishedAt = publishedAt.toISOString();
  await ContentVersion.create({ entityType, entityId, version, snapshot, publishedBy: adminId, publishedAt, note });
  doc.set({ publishedVersion: version, publishedAt, reviewRequestedAt: null, reviewRequestedBy: null });
  await doc.save();
  clearPublishedCache();
  return { version, publishedAt: publishedAt.toISOString() };
}

export async function unpublish(entityType: ContentEntityType, entityId: string) {
  if (entityType !== 'pillar') throw new ApiError(400, 'NOT_SUPPORTED', 'Only roadmaps can be unpublished');
  const doc = await entityDoc(entityType, entityId);
  doc.set({ publishedVersion: null, publishedAt: null });
  await doc.save();
  clearPublishedCache();
}

/** Returns the published snapshot (without admin-only fields), or null when nothing is published. */
export async function getPublished<T>(entityType: ContentEntityType, entityId: string): Promise<T | null> {
  const key = cacheKey(entityType, entityId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T | null;
  const doc = await entityDoc(entityType, entityId).catch(() => null);
  let value: T | null = null;
  if (doc?.publishedVersion) {
    const v = await ContentVersion.findOne({ entityType, entityId, version: doc.publishedVersion }).lean();
    if (v) {
      const { _raw, _rawMilestones, hiddenMilestones, ...publicSnapshot } = v.snapshot as Record<string, unknown>;
      void _raw;
      void _rawMilestones;
      void hiddenMilestones;
      value = publicSnapshot as T;
    }
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Copies a published snapshot back into the editable draft. Publish again to make it live. */
export async function restoreVersion(versionId: string) {
  const v = await ContentVersion.findById(versionId).lean();
  if (!v) throw notFound('Version');
  const snap = v.snapshot as Record<string, unknown>;
  if (v.entityType === 'candidate') {
    const raw = snap._raw as Record<string, unknown> | undefined;
    if (!raw) throw new ApiError(422, 'NOT_RESTORABLE', 'This version cannot be restored');
    const fields = ['name', 'title', 'introduction', 'biography', 'education', 'experience', 'skills', 'motivation', 'vision', 'achievements', 'portraitAssetId', 'portraitFocal', 'pose', 'en'];
    const doc = await getCandidateDoc();
    for (const f of fields) doc.set(f, raw[f]);
    doc.draftUpdatedAt = new Date();
    await doc.save();
  } else if (v.entityType === 'settings') {
    const doc = await getSettingsDoc();
    const fields = ['branding', 'animationsEnabled', 'introEnabled', 'maintenanceMode', 'maintenanceMessage', 'socialLinks', 'privacyNotice', 'en'];
    for (const f of fields) doc.set(f, snap[f]);
    doc.draftUpdatedAt = new Date();
    await doc.save();
  } else {
    const pillar = await getPillarDoc(v.entityId as PillarSlug);
    for (const f of ['name', 'subtitle', 'tagline', 'description', 'conclusion', 'icon', 'theme', 'en']) pillar.set(f, snap[f] ?? (f === 'en' ? {} : undefined));
    pillar.draftUpdatedAt = new Date();
    await pillar.save();
    const raw = (snap._rawMilestones as Array<Record<string, unknown>> | undefined) ?? [];
    await Milestone.deleteMany({ pillarId: pillar._id });
    if (raw.length) await Milestone.insertMany(raw.map((m) => ({ ...m, pillarId: pillar._id })));
  }
  return { entityType: v.entityType, entityId: v.entityId, version: v.version };
}

export async function touchDraft(entityType: ContentEntityType, entityId: string) {
  const doc = await entityDoc(entityType, entityId);
  doc.set({ draftUpdatedAt: new Date() });
  await doc.save();
}

export function publishState(doc: { publishedVersion?: number | null; publishedAt?: Date | null; draftUpdatedAt?: Date | null; reviewRequestedAt?: Date | null }) {
  const hasUnpublishedChanges =
    !doc.publishedAt || (doc.draftUpdatedAt ? doc.draftUpdatedAt.getTime() > doc.publishedAt.getTime() : false);
  return {
    publishedVersion: doc.publishedVersion ?? null,
    publishedAt: iso(doc.publishedAt),
    draftUpdatedAt: iso(doc.draftUpdatedAt),
    reviewRequestedAt: iso(doc.reviewRequestedAt),
    hasUnpublishedChanges,
  };
}
