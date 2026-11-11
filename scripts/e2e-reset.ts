/**
 * Resets the isolated E2E database: drops it, re-creates indexes, seeds + publishes starter
 * content and provisions test-only admin accounts. Refuses to touch non-test databases.
 * Usage: tsx scripts/e2e-reset.ts   (MONGODB_URI must point to a database named *_e2e)
 */
import path from 'node:path';
import mongoose from 'mongoose';
import { loadConfig } from '../apps/api/src/config/env';
import { connectDb, syncIndexes } from '../apps/api/src/db';
import { seedContent } from '../apps/api/src/seed/seed';
import { Admin } from '../apps/api/src/models/admin';
import { hashPassword } from '../apps/api/src/services/auth';
import { E2E_USERS } from '../tests/e2e/credentials';

const config = loadConfig();
const dbName = new URL(config.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.slice(1);
if (!dbName.endsWith('_e2e')) {
  console.error(`Refusing to reset "${dbName}": E2E database names must end with _e2e.`);
  process.exit(1);
}
await connectDb(config.MONGODB_URI);
await mongoose.connection.dropDatabase();
await syncIndexes();
await seedContent({ uploadDir: config.uploadDir, imagesDir: path.resolve(import.meta.dirname, '../assets/candidate'), publish: true });
for (const u of E2E_USERS) await Admin.create({ username: u.username, role: u.role, passwordHash: await hashPassword(u.password) });
console.log(`E2E database ${dbName} ready.`);
await mongoose.disconnect();
