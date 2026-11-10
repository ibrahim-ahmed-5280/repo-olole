import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import request from 'supertest';
import { loadConfig } from '../src/config/env';
import { createLogger } from '../src/config/logger';
import { createApp, type AppOptions } from '../src/app';
import { connectDb, syncIndexes } from '../src/db';
import { seedContent } from '../src/seed/seed';
import { Admin } from '../src/models/admin';
import { hashPassword } from '../src/services/auth';
import { clearPublishedCache } from '../src/services/content';

export const TEST_PASSWORD = 'Test-Password-123';
const BASE = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017';

/** Spins up an isolated, uniquely-named test database with seeded + published content. */
export async function setupTestApp(options: AppOptions & { env?: Record<string, string> } = {}) {
  const dbName = `reveal_test_${crypto.randomBytes(4).toString('hex')}`;
  const config = loadConfig({
    NODE_ENV: 'test',
    MONGODB_URI: `${BASE}/${dbName}`,
    ANALYTICS_SECRET: 'test-secret-test-secret-test-secret-123',
    ALLOWED_ORIGINS: 'http://localhost:5173',
    UPLOAD_DIR: path.join(os.tmpdir(), dbName),
    LOG_LEVEL: 'silent',
    ...options.env,
  });
  await connectDb(config.MONGODB_URI);
  await syncIndexes();
  clearPublishedCache();
  await seedContent({ uploadDir: config.uploadDir, publish: true });
  for (const role of ['owner', 'editor', 'reviewer'] as const) {
    await Admin.create({ username: role, role, passwordHash: await hashPassword(TEST_PASSWORD) });
  }
  const app = createApp(config, createLogger('silent'), options);
  return {
    app,
    config,
    async teardown() {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
}

/** Logs in and returns an agent carrying cookies plus the CSRF token to send on mutations. */
export async function login(app: Parameters<typeof request>[0], username: string, password = TEST_PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/admin/auth/login').send({ username, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, csrf: res.body.data.csrfToken as string, res };
}
