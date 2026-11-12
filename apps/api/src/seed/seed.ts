import fs from 'node:fs/promises';
import path from 'node:path';
import { CandidateProfile, Milestone, Pillar, WebsiteSettings } from '../models/content';
import { storeImage } from '../services/media';
import { publish } from '../services/content';
import { DEFAULT_CANDIDATE, DEFAULT_PILLARS, DEFAULT_SETTINGS, SEED_IMAGES, milestoneDocs } from './defaultContent';

export interface SeedOptions {
  uploadDir: string;
  /** Folder holding the approved candidate photos (SEED_IMAGES), imported if not set yet. */
  imagesDir?: string;
  /** Publish seeded content that has never been published. */
  publish?: boolean;
}

/** Idempotent: only creates what is missing and never overwrites edited content. */
export async function seedContent(opts: SeedOptions) {
  const report: string[] = [];

  if (!(await WebsiteSettings.exists({ key: 'main' }))) {
    await WebsiteSettings.create({ key: 'main', ...DEFAULT_SETTINGS });
    report.push('settings created');
  }

  if (!(await CandidateProfile.exists({ key: 'main' }))) {
    await CandidateProfile.create({ key: 'main', ...DEFAULT_CANDIDATE });
    report.push('candidate profile created');
  }

  const candidate = (await CandidateProfile.findOne({ key: 'main' }))!;
  const importImage = async (kind: keyof typeof SEED_IMAGES) => {
    const { file, alt } = SEED_IMAGES[kind];
    const asset = await storeImage({ uploadDir: opts.uploadDir, buffer: await fs.readFile(path.join(opts.imagesDir!, file)), originalName: file, altText: alt });
    report.push(`${kind} image imported (${file})`);
    return asset._id;
  };
  if (opts.imagesDir) {
    try {
      if (!candidate.portraitAssetId) candidate.portraitAssetId = await importImage('portrait');
      if (!candidate.pose?.assetId) candidate.set('pose.assetId', await importImage('pose'));
      await candidate.save();
    } catch (err) {
      report.push(`images not imported (${(err as Error).message})`);
    }
  }

  for (const p of DEFAULT_PILLARS) {
    let pillar = await Pillar.findOne({ slug: p.slug });
    if (!pillar) {
      const { milestones: _m, ...fields } = p;
      pillar = await Pillar.create(fields);
      report.push(`pillar ${p.slug} created`);
    }
    if ((await Milestone.countDocuments({ pillarId: pillar._id })) === 0) {
      await Milestone.insertMany(milestoneDocs(p).map((m) => ({ pillarId: pillar!._id, ...m })));
      report.push(`${p.milestones.length} milestones added to ${p.slug}`);
    }
  }

  if (opts.publish) {
    if (!(await WebsiteSettings.findOne({ key: 'main' }))?.publishedVersion) {
      await publish('settings', 'main', null, 'Initial seed');
      report.push('settings published');
    }
    if (!(await CandidateProfile.findOne({ key: 'main' }))?.publishedVersion) {
      await publish('candidate', 'main', null, 'Initial seed');
      report.push('candidate published');
    }
    for (const p of DEFAULT_PILLARS) {
      if (!(await Pillar.findOne({ slug: p.slug }))?.publishedVersion) {
        await publish('pillar', p.slug, null, 'Initial seed');
        report.push(`${p.slug} published`);
      }
    }
  }
  return report;
}
