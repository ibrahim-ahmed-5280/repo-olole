import fs from 'node:fs/promises';
import { CandidateProfile, Milestone, Pillar, WebsiteSettings } from '../models/content';
import { storeImage } from '../services/media';
import { publish } from '../services/content';
import { DEFAULT_CANDIDATE, DEFAULT_PILLARS, DEFAULT_SETTINGS, exampleMilestone } from './defaultContent';

export interface SeedOptions {
  uploadDir: string;
  /** Path to the approved candidate portrait to import if no portrait is set yet. */
  portraitPath?: string;
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
  if (!candidate.portraitAssetId && opts.portraitPath) {
    try {
      const buffer = await fs.readFile(opts.portraitPath);
      const asset = await storeImage({
        uploadDir: opts.uploadDir,
        buffer,
        originalName: 'portrait-headshot.jpg',
        altText: `Sawirka ${DEFAULT_CANDIDATE.name}`,
      });
      candidate.portraitAssetId = asset._id;
      candidate.set('pose.assetId', asset._id);
      await candidate.save();
      report.push('portrait imported');
    } catch (err) {
      report.push(`portrait not imported (${(err as Error).message})`);
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
      await Milestone.insertMany(
        p.milestones.map((m, i) => ({ pillarId: pillar!._id, title: m.title, icon: m.icon, order: i + 1, ...exampleMilestone(m.topic) })),
      );
      report.push(`${p.milestones.length} example milestones added to ${p.slug}`);
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
