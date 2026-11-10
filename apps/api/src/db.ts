import mongoose from 'mongoose';
import { Admin, AdminSession } from './models/admin';
import { CandidateProfile, ContentVersion, Milestone, Pillar, WebsiteSettings } from './models/content';
import { AnalyticsDaily, AnalyticsDedup, AuditLog, Feedback, MediaAsset } from './models/records';

export const ALL_MODELS = [
  Admin,
  AdminSession,
  CandidateProfile,
  Pillar,
  Milestone,
  WebsiteSettings,
  ContentVersion,
  Feedback,
  AnalyticsDaily,
  AnalyticsDedup,
  MediaAsset,
  AuditLog,
];

export async function connectDb(uri: string) {
  mongoose.set('strictQuery', true);
  // Indexes are created explicitly via `npm run db:init` (and in tests) rather than on every boot.
  mongoose.set('autoIndex', false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 20 });
  return mongoose.connection;
}

/** Creates/updates every declared index (unique, compound, text and TTL). */
export async function syncIndexes() {
  const results: Record<string, string[]> = {};
  for (const m of ALL_MODELS) {
    await m.createCollection().catch(() => undefined);
    results[m.collection.name] = (await m.syncIndexes()) as string[];
  }
  return results;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
