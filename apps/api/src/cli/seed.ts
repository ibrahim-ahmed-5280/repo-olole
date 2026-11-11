import path from 'node:path';
import { loadConfig } from '../config/env';
import { connectDb, disconnectDb, syncIndexes } from '../db';
import { seedContent } from '../seed/seed';

/**
 * Usage: npm run db:seed [-- --no-publish] [-- --images <folder>]
 * Creates any missing starter content (clearly marked examples) and imports the approved
 * candidate photos from assets/candidate (intro portrait + arms-open pose).
 */
const args = process.argv.slice(2);
const imagesArg = args.indexOf('--images');
const imagesDir = imagesArg >= 0 ? args[imagesArg + 1] : path.resolve(process.cwd(), '../../assets/candidate');

const config = loadConfig();
await connectDb(config.MONGODB_URI);
await syncIndexes();
const report = await seedContent({ uploadDir: config.uploadDir, imagesDir, publish: !args.includes('--no-publish') });
console.log(report.length ? report.map((r) => `• ${r}`).join('\n') : 'Nothing to do — content already exists.');
await disconnectDb();
