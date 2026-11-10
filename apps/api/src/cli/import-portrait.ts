import fs from 'node:fs/promises';
import { loadConfig } from '../config/env';
import { connectDb, disconnectDb } from '../db';
import { CandidateProfile } from '../models/content';
import { storeImage } from '../services/media';

/**
 * Image-replacement workflow for approved candidate photos (also available in Admin → Media / Candidate).
 *   npm run media:import-portrait -- --file ./arms-open.jpg --as pose --alt "Eng. Zakariye with arms open" [--not-placeholder]
 *   --as portrait | pose | both
 * Changes the DRAFT only; publish from Admin → Candidate Profile after adjusting hotspot anchors.
 */
const get = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const file = get('file');
const as = get('as') ?? 'both';
if (!file || !['portrait', 'pose', 'both'].includes(as)) {
  console.error('Usage: npm run media:import-portrait -- --file <path> [--as portrait|pose|both] [--alt "text"] [--not-placeholder]');
  process.exit(1);
}

const config = loadConfig();
await connectDb(config.MONGODB_URI);
const asset = await storeImage({ uploadDir: config.uploadDir, buffer: await fs.readFile(file), originalName: file.split(/[\\/]/).pop(), altText: get('alt') ?? '' });
const c = await CandidateProfile.findOne({ key: 'main' });
if (!c) {
  console.error('Run `npm run db:seed` first.');
  process.exit(1);
}
if (as !== 'pose') c.portraitAssetId = asset._id;
if (as !== 'portrait') {
  c.set('pose.assetId', asset._id);
  if (process.argv.includes('--not-placeholder')) c.set('pose.isPlaceholder', false);
}
c.draftUpdatedAt = new Date();
await c.save();
console.log(`✔ Imported ${asset.width}×${asset.height} image (${asset.variants.length} WebP variants). Draft updated — review hotspots and publish in the admin.`);
await disconnectDb();
