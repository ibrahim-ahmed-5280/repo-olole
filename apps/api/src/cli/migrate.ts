import path from 'node:path';
import { loadConfig } from '../config/env';
import { connectDb, disconnectDb } from '../db';
import { migrateContent } from '../seed/migrate';

/**
 * Usage: npm run db:migrate [-- --images <folder>]
 * Idempotent content migration (bilingual texts, written pillars, background-free photos).
 * Never overwrites content an editor has changed. Safe to run on every deploy.
 */
const args = process.argv.slice(2);
const imagesArg = args.indexOf('--images');
const imagesDir = imagesArg >= 0 ? args[imagesArg + 1] : path.resolve(process.cwd(), '../../assets/candidate');

const config = loadConfig();
await connectDb(config.MONGODB_URI);
const report = await migrateContent({ uploadDir: config.uploadDir, imagesDir });
console.log(report.length ? report.map((r) => `• ${r}`).join('\n') : 'Content is up to date — nothing to migrate.');
await disconnectDb();
