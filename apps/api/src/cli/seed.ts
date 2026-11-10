import path from 'node:path';
import { loadConfig } from '../config/env';
import { connectDb, disconnectDb, syncIndexes } from '../db';
import { seedContent } from '../seed/seed';

/**
 * Usage: npm run db:seed [-- --no-publish] [-- --portrait <path>]
 * Creates any missing starter content (clearly marked examples) and imports the supplied portrait.
 */
const args = process.argv.slice(2);
const portraitArg = args.indexOf('--portrait');
const portraitPath = portraitArg >= 0 ? args[portraitArg + 1] : path.resolve(process.cwd(), '../../assets/candidate/portrait-headshot.jpg');

const config = loadConfig();
await connectDb(config.MONGODB_URI);
await syncIndexes();
const report = await seedContent({ uploadDir: config.uploadDir, portraitPath, publish: !args.includes('--no-publish') });
console.log(report.length ? report.map((r) => `• ${r}`).join('\n') : 'Nothing to do — content already exists.');
await disconnectDb();
