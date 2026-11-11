import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env';

const prod = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://reveal:x@127.0.0.1:27017/the_reveal?authSource=the_reveal',
  ANALYTICS_SECRET: 'a'.repeat(48),
  COOKIE_SECURE: 'true',
  PUBLIC_ORIGIN: 'https://zdu.elivateict.com',
  ALLOWED_ORIGINS: 'https://zdu.elivateict.com',
  UPLOAD_DIR: '/srv/the-reveal/uploads',
  PORT: '4320',
  TRUST_PROXY: '1',
};

describe('production configuration guards', () => {
  it('accepts a complete production configuration', () => {
    const c = loadConfig(prod);
    expect(c.isProd).toBe(true);
    expect(c.PORT).toBe(4320);
    expect(c.allowedOrigins).toEqual(['https://zdu.elivateict.com']);
  });

  it('refuses insecure or incomplete production settings', () => {
    expect(() => loadConfig({ ...prod, COOKIE_SECURE: 'false' })).toThrow(/COOKIE_SECURE/);
    expect(() => loadConfig({ ...prod, ANALYTICS_SECRET: 'change-me-to-a-long-random-string-of-at-least-32-chars' })).toThrow(/ANALYTICS_SECRET/);
    expect(() => loadConfig({ ...prod, PUBLIC_ORIGIN: 'http://zdu.elivateict.com' })).toThrow(/https/);
    expect(() => loadConfig({ ...prod, UPLOAD_DIR: './uploads' })).toThrow(/absolute/);
    expect(() => loadConfig({ ...prod, RATE_LIMIT_DISABLED: 'true' })).toThrow(/RATE_LIMIT/);
    expect(() => loadConfig({ ...prod, MONGODB_URI: undefined })).toThrow(/MONGODB_URI/);
  });
});
