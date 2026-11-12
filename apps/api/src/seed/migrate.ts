import fs from 'node:fs/promises';
import path from 'node:path';
import type { PillarSlug } from '@reveal/shared';
import { CandidateProfile, Milestone, Pillar, WebsiteSettings } from '../models/content';
import { MediaAsset } from '../models/records';
import { storeImage } from '../services/media';
import { publish, publishState } from '../services/content';
import {
  DEFAULT_CANDIDATE,
  DEFAULT_PILLARS,
  DEFAULT_SETTINGS,
  PREVIOUS_PILLAR_TEXT,
  PREVIOUS_SEED_IMAGE_FILES,
  SEED_IMAGES,
  milestoneDocs,
} from './defaultContent';

export interface MigrateOptions {
  uploadDir: string;
  /** Folder holding SEED_IMAGES; without it images are left unchanged. */
  imagesDir?: string;
}

const OLD_POSE_ANCHORS = { education: { x: 0.09, y: 0.465 }, unity: { x: 0.91, y: 0.465 } };
const isEmpty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const same = (a?: { x?: number | null; y?: number | null } | null, b?: { x: number; y: number }) =>
  !!a && !!b && a.x === b.x && a.y === b.y;

/**
 * Content migration for the bilingual refinement. Idempotent and conservative:
 *  • fills English fields only where they are empty;
 *  • replaces pillar texts / milestones only while they are still the untouched old seed examples;
 *  • swaps candidate photos only while they are still the old seed photos;
 *  • republishes an entity only if it was changed here AND had no unpublished editor changes.
 */
export async function migrateContent(opts: MigrateOptions) {
  const report: string[] = [];
  const toPublish: Array<{ type: 'candidate' | 'settings' | 'pillar'; id: string; wasClean: boolean }> = [];
  const clean = (doc: Parameters<typeof publishState>[0]) => !!doc.publishedAt && !publishState(doc).hasUnpublishedChanges;

  // ── Settings: English translations ──
  const settings = await WebsiteSettings.findOne({ key: 'main' });
  if (settings) {
    const wasClean = clean(settings);
    let changed = false;
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS.en)) {
      if (isEmpty(settings.get(`en.${k}`))) {
        settings.set(`en.${k}`, v);
        changed = true;
      }
    }
    if (changed) {
      await settings.save();
      report.push('settings: English texts added');
      toPublish.push({ type: 'settings', id: 'main', wasClean });
    }
  }

  // ── Candidate: English title + new background-free photos ──
  const candidate = await CandidateProfile.findOne({ key: 'main' });
  if (candidate) {
    const wasClean = clean(candidate);
    let changed = false;
    if (isEmpty(candidate.get('en.title'))) {
      candidate.set('en.title', DEFAULT_CANDIDATE.en.title);
      changed = true;
      report.push('candidate: English title added');
    }
    const isOldSeedImage = async (id: unknown) => {
      if (!id) return false;
      const asset = await MediaAsset.findById(id).select('originalName').lean();
      return !!asset && PREVIOUS_SEED_IMAGE_FILES.includes(asset.originalName ?? '');
    };
    const importImage = async (kind: keyof typeof SEED_IMAGES) => {
      const { file, alt } = SEED_IMAGES[kind];
      const buffer = await fs.readFile(path.join(opts.imagesDir!, file));
      return (await storeImage({ uploadDir: opts.uploadDir, buffer, originalName: file, altText: alt }))._id;
    };
    if (opts.imagesDir) {
      try {
        if (await isOldSeedImage(candidate.portraitAssetId)) {
          candidate.portraitAssetId = await importImage('portrait');
          candidate.set('portraitFocal', DEFAULT_CANDIDATE.portraitFocal);
          changed = true;
          report.push(`candidate: intro portrait replaced (${SEED_IMAGES.portrait.file})`);
        }
        if (await isOldSeedImage(candidate.pose?.assetId)) {
          candidate.set('pose.assetId', await importImage('pose'));
          const a = candidate.pose?.anchors;
          if (same(a?.education, OLD_POSE_ANCHORS.education) && same(a?.unity, OLD_POSE_ANCHORS.unity)) {
            candidate.set('pose.anchors', DEFAULT_CANDIDATE.pose.anchors);
          }
          changed = true;
          report.push(`candidate: pose photo replaced (${SEED_IMAGES.pose.file})`);
        }
      } catch (err) {
        report.push(`candidate: images not replaced (${(err as Error).message})`);
      }
    }
    if (changed) {
      candidate.draftUpdatedAt = new Date();
      await candidate.save();
      toPublish.push({ type: 'candidate', id: 'main', wasClean });
    }
  }

  // ── Pillars: real content instead of the "Tusaale" examples, plus English ──
  for (const seed of DEFAULT_PILLARS) {
    const pillar = await Pillar.findOne({ slug: seed.slug });
    if (!pillar) continue;
    const wasClean = clean(pillar);
    let changed = false;
    const old = PREVIOUS_PILLAR_TEXT[seed.slug as PillarSlug];
    for (const f of ['description', 'conclusion'] as const) {
      if (pillar[f] === old[f]) {
        pillar.set(f, seed[f]);
        changed = true;
      }
    }
    for (const [k, v] of Object.entries(seed.en)) {
      if (isEmpty(pillar.get(`en.${k}`))) {
        pillar.set(`en.${k}`, v);
        changed = true;
      }
    }
    const milestones = await Milestone.find({ pillarId: pillar._id }).select('isExample').lean();
    if (milestones.length > 0 && milestones.every((m) => m.isExample)) {
      await Milestone.deleteMany({ pillarId: pillar._id });
      await Milestone.insertMany(milestoneDocs(seed).map((m) => ({ pillarId: pillar._id, ...m })));
      changed = true;
      report.push(`${seed.slug}: ${milestones.length} example milestones replaced by ${seed.milestones.length} written milestones`);
    }
    if (changed) {
      pillar.draftUpdatedAt = new Date();
      await pillar.save();
      report.push(`${seed.slug}: pillar texts updated`);
      toPublish.push({ type: 'pillar', id: seed.slug, wasClean });
    }
  }

  for (const p of toPublish) {
    if (p.wasClean) {
      await publish(p.type, p.id, null, 'Content migration: bilingual refinement');
      report.push(`${p.type} ${p.id}: published`);
    } else {
      report.push(`${p.type} ${p.id}: left as draft (it had unpublished edits or was never published) — publish it in the admin`);
    }
  }
  return report;
}
