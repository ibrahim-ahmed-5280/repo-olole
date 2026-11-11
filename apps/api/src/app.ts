import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { PILLAR_SLUGS, absoluteUrl } from '@reveal/shared';
import type { AppConfig } from './config/env';
import type { Logger } from './config/logger';
import { loadSession, originGuard, requireAuth, requireCsrf } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errors';
import { DEFAULT_LIMITS, createLimiters, type RateLimits } from './middleware/rateLimit';
import { publicRouter } from './routes/public';
import { authRouter } from './routes/admin/auth';
import { contentRouter } from './routes/admin/content';
import { recordsRouter } from './routes/admin/records';
import { systemRouter } from './routes/admin/system';
import { openApiDocument } from './openapi';

export interface AppOptions {
  limits?: Partial<RateLimits>;
}

export function createApp(config: AppConfig, logger: Logger, options: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);
  app.set('query parser', 'simple');

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = crypto.randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      // Minimal request logs: no IP address, no headers, no bodies.
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: String(req.url).split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"],
          'object-src': ["'none'"],
          // Disabled on purpose: Nginx already redirects all public HTTP to HTTPS (with HSTS), and this
          // directive would break the http://localhost SSH-tunnel staging check of the production build.
          'upgrade-insecure-requests': null,
        },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: config.isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    next();
  });
  app.use(compression());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.allowedOrigins.includes(origin.replace(/\/$/, ''))),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      maxAge: 600,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb', strict: true }));

  const limiters = createLimiters(config, { ...DEFAULT_LIMITS, ...options.limits });

  const api = Router();
  api.use(originGuard(config));
  api.get('/openapi.json', (_req, res) => res.json(openApiDocument));
  api.use(publicRouter(config, limiters));

  const admin = Router();
  admin.use(limiters.admin);
  admin.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  admin.use(loadSession(config));
  admin.use('/auth', authRouter(config, limiters));
  admin.use(requireAuth, requireCsrf);
  admin.use(contentRouter());
  admin.use(recordsRouter(config));
  admin.use(systemRouter());
  api.use('/admin', admin);

  app.use('/api/v1', api);
  app.use('/api', notFoundHandler);

  // Uploaded media: server-generated names only, long-lived immutable caching.
  app.use(
    '/media',
    express.static(config.uploadDir, {
      immutable: true,
      maxAge: '365d',
      index: false,
      dotfiles: 'deny',
      fallthrough: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${absoluteUrl(config.PUBLIC_ORIGIN, '/sitemap.xml')}\n`);
  });
  app.get('/sitemap.xml', (_req, res) => {
    const paths = ['/', '/vision', ...PILLAR_SLUGS.map((s) => `/roadmap/${s}`), '/privacy'];
    const urls = paths.map((p) => `  <url><loc>${absoluteUrl(config.PUBLIC_ORIGIN, p)}</loc></url>`).join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  });

  if (config.SERVE_WEB && fs.existsSync(config.webDistDir)) {
    app.use(
      express.static(config.webDistDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    const indexHtml = path.join(config.webDistDir, 'index.html');
    // SPA fallback so refreshing nested routes (e.g. /roadmap/midnimo) works.
    app.get(/^\/(?!api\/|media\/).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler(logger, config.isProd));
  return app;
}
