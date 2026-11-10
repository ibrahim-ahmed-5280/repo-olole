/**
 * OpenAPI 3.1 description of the REST API. Served at GET /api/v1/openapi.json.
 * Request bodies are validated with the Zod schemas in @reveal/shared (the source of truth);
 * this document mirrors them for API consumers.
 */
const envelope = (data: object) => ({
  type: 'object',
  properties: { ok: { const: true }, data, meta: { $ref: '#/components/schemas/PageMeta' } },
});
const okJson = (description: string, data: object = { type: 'object' }) => ({
  description,
  content: { 'application/json': { schema: envelope(data) } },
});
const errors = {
  400: { $ref: '#/components/responses/Error' },
  401: { $ref: '#/components/responses/Error' },
  403: { $ref: '#/components/responses/Error' },
  404: { $ref: '#/components/responses/Error' },
  429: { $ref: '#/components/responses/Error' },
};
const body = (ref: string) => ({ required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } } });
const slug = { name: 'slug', in: 'path', required: true, schema: { $ref: '#/components/schemas/PillarSlug' } };
const id = { name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } };
const range = [
  { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
  { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
];
const admin = (tag: string, summary: string, extra: object = {}) => ({ tags: [tag], summary, security: [{ session: [], csrf: [] }], responses: { 200: okJson(summary), ...errors }, ...extra });

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'THE REVEAL API',
    version: '1.0.0',
    description:
      'Public content, anonymous feedback, privacy-respecting analytics and the admin CMS. All responses use the envelope `{ ok, data, meta? }` or `{ ok:false, error:{ code, message, details?, requestId? } }`. Admin mutations require the `reveal_sid` session cookie AND an `X-CSRF-Token` header equal to the `reveal_csrf` cookie.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      session: { type: 'apiKey', in: 'cookie', name: 'reveal_sid' },
      csrf: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
    },
    responses: {
      Error: {
        description: 'Error envelope',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: { const: false },
                error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: {}, requestId: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    schemas: {
      PageMeta: { type: 'object', properties: { page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' } } },
      PillarSlug: { type: 'string', enum: ['waxbarasho', 'midnimo', 'hoggaan'] },
      FeedbackInput: {
        type: 'object',
        additionalProperties: false,
        required: ['pillar', 'response'],
        properties: {
          pillar: { $ref: '#/components/schemas/PillarSlug' },
          response: { type: 'string', enum: ['yes', 'no'] },
          suggestion: { type: 'string', maxLength: 1000 },
          website: { type: 'string', maxLength: 0, description: 'Honeypot — leave empty' },
        },
      },
      AnalyticsEvent: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'route', 'sid'],
        properties: {
          type: { type: 'string', enum: ['page_view', 'intro_reveal', 'intro_skip', 'hotspot_click', 'about_open', 'roadmap_view', 'milestone_view', 'roadmap_complete', 'feedback_submit'] },
          route: { type: 'string', pattern: '^/[a-zA-Z0-9\\-/]*$' },
          pillar: { $ref: '#/components/schemas/PillarSlug' },
          milestoneId: { type: 'string' },
          target: { type: 'string', enum: ['education', 'unity', 'leadership', 'about'] },
          sid: { type: 'string', pattern: '^[A-Za-z0-9_-]{16,64}$', description: 'Random per-tab token; hashed with a daily rotating key, never stored raw' },
        },
      },
      Login: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string' }, password: { type: 'string', format: 'password' } } },
      CandidateUpdate: { type: 'object', description: 'Partial update. See candidateUpdateSchema in packages/shared/src/schemas.ts.' },
      PillarUpdate: { type: 'object', properties: { name: { type: 'string' }, subtitle: { type: 'string' }, tagline: { type: 'string' }, description: { type: 'string' }, conclusion: { type: 'string' }, icon: { type: 'string' }, theme: { type: 'string' } } },
      MilestoneInput: {
        type: 'object',
        required: ['pillar', 'title', 'icon'],
        properties: {
          pillar: { $ref: '#/components/schemas/PillarSlug' },
          title: { type: 'string' }, summary: { type: 'string' }, description: { type: 'string' }, problem: { type: 'string' },
          solution: { type: 'string' }, implementation: { type: 'string' }, expectedBenefit: { type: 'string' }, timeframe: { type: 'string' },
          icon: { type: 'string' }, illustrationAssetId: { type: ['string', 'null'] }, status: { type: 'string', enum: ['active', 'hidden'] }, isExample: { type: 'boolean' },
        },
      },
      Reorder: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' } } } },
      SettingsUpdate: { type: 'object', description: 'Partial update. See settingsUpdateSchema.' },
      Moderation: { type: 'object', properties: { moderationStatus: { type: 'string', enum: ['new', 'reviewed', 'hidden'] }, reviewNote: { type: 'string' } } },
      CreateAdmin: { type: 'object', required: ['username', 'role', 'password'], properties: { username: { type: 'string' }, email: { type: 'string' }, role: { type: 'string', enum: ['owner', 'editor', 'reviewer'] }, password: { type: 'string', minLength: 12 } } },
      UpdateAdmin: { type: 'object', properties: { role: { type: 'string', enum: ['owner', 'editor', 'reviewer'] }, status: { type: 'string', enum: ['active', 'disabled'] } } },
      ChangePassword: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 12 } } },
    },
  },
  paths: {
    '/health': { get: { tags: ['Public'], summary: 'Liveness + database check', responses: { 200: okJson('Healthy'), 503: { description: 'Database unavailable' } } } },
    '/site': { get: { tags: ['Public'], summary: 'Published website settings', responses: { 200: okJson('Settings') } } },
    '/candidate': { get: { tags: ['Public'], summary: 'Published candidate profile', responses: { 200: okJson('Candidate'), ...errors } } },
    '/pillars': { get: { tags: ['Public'], summary: 'Published pillars (without milestones)', responses: { 200: okJson('Pillars', { type: 'array' }) } } },
    '/pillars/{slug}': { get: { tags: ['Public'], summary: 'Published roadmap with milestones', parameters: [slug], responses: { 200: okJson('Roadmap'), ...errors } } },
    '/pillars/{slug}/milestones': { get: { tags: ['Public'], summary: 'Published milestones of a roadmap', parameters: [slug], responses: { 200: okJson('Milestones', { type: 'array' }), ...errors } } },
    '/feedback': { post: { tags: ['Public'], summary: 'Submit optional anonymous roadmap feedback (rate limited)', requestBody: body('FeedbackInput'), responses: { 201: okJson('Received'), ...errors } } },
    '/analytics/events': { post: { tags: ['Public'], summary: 'Record an aggregate analytics event (de-duplicated per session)', requestBody: body('AnalyticsEvent'), responses: { 202: okJson('Accepted'), ...errors } } },

    '/admin/auth/login': { post: { tags: ['Auth'], summary: 'Sign in; sets HttpOnly session cookie and CSRF cookie', requestBody: body('Login'), responses: { 200: okJson('Signed in'), ...errors } } },
    '/admin/auth/logout': { post: admin('Auth', 'Sign out and revoke the current session') },
    '/admin/auth/me': { get: admin('Auth', 'Current admin and permissions') },
    '/admin/auth/password': { post: admin('Auth', 'Change own password (revokes other sessions)', { requestBody: body('ChangePassword') }) },
    '/admin/auth/sessions': { get: admin('Auth', 'List own active sessions') },
    '/admin/auth/sessions/{id}': { delete: admin('Auth', 'Revoke one of own sessions', { parameters: [id] }) },

    '/admin/dashboard': { get: admin('Dashboard', 'Role-aware overview') },
    '/admin/candidate': {
      get: admin('Content', 'Candidate draft + publish state'),
      patch: admin('Content', 'Save candidate draft', { requestBody: body('CandidateUpdate') }),
    },
    '/admin/candidate/publish': { post: admin('Content', 'Publish candidate draft (owner)') },
    '/admin/candidate/request-review': { post: admin('Content', 'Ask an owner to publish (editor)') },
    '/admin/preview/candidate': { get: admin('Content', 'Preview candidate draft') },
    '/admin/pillars': { get: admin('Content', 'All pillars with publish state') },
    '/admin/pillars/{slug}': {
      get: admin('Content', 'Pillar draft with all milestones', { parameters: [slug] }),
      patch: admin('Content', 'Save pillar draft', { parameters: [slug], requestBody: body('PillarUpdate') }),
    },
    '/admin/pillars/{slug}/publish': { post: admin('Content', 'Publish roadmap (owner)', { parameters: [slug] }) },
    '/admin/pillars/{slug}/unpublish': { post: admin('Content', 'Unpublish roadmap (owner)', { parameters: [slug] }) },
    '/admin/pillars/{slug}/request-review': { post: admin('Content', 'Request publication (editor)', { parameters: [slug] }) },
    '/admin/pillars/{slug}/milestone-order': { put: admin('Content', 'Reorder milestones', { parameters: [slug], requestBody: body('Reorder') }) },
    '/admin/preview/pillars/{slug}': { get: admin('Content', 'Preview roadmap draft', { parameters: [slug] }) },
    '/admin/milestones': { post: admin('Content', 'Create milestone', { requestBody: body('MilestoneInput') }) },
    '/admin/milestones/{id}': {
      patch: admin('Content', 'Update milestone', { parameters: [id] }),
      delete: admin('Content', 'Delete milestone', { parameters: [id] }),
    },
    '/admin/versions': { get: admin('Content', 'Version history', { parameters: [{ name: 'entityType', in: 'query', required: true, schema: { type: 'string', enum: ['candidate', 'pillar', 'settings'] } }, { name: 'entityId', in: 'query', required: true, schema: { type: 'string' } }] }) },
    '/admin/versions/{id}/restore': { post: admin('Content', 'Restore a version into the draft', { parameters: [id] }) },
    '/admin/feedback': { get: admin('Feedback', 'Feedback inbox (filters + pagination)', { parameters: [...range, { name: 'pillar', in: 'query', schema: { type: 'string' } }, { name: 'response', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'pageSize', in: 'query', schema: { type: 'integer' } }] }) },
    '/admin/feedback/export.csv': { get: admin('Feedback', 'CSV export (no personal data is stored)', { responses: { 200: { description: 'CSV', content: { 'text/csv': {} } } } }) },
    '/admin/feedback/{id}': { patch: admin('Feedback', 'Moderate feedback', { parameters: [id], requestBody: body('Moderation') }) },
    '/admin/analytics': { get: admin('Analytics', 'Aggregate analytics for a date range', { parameters: range }) },
    '/admin/media': {
      get: admin('Media', 'List media'),
      post: admin('Media', 'Upload image (multipart field "file", optional "altText")', { requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, altText: { type: 'string' } } } } } } }),
    },
    '/admin/media/{id}': { patch: admin('Media', 'Update alt text', { parameters: [id] }), delete: admin('Media', 'Delete unused media', { parameters: [id] }) },
    '/admin/settings': { get: admin('Settings', 'Settings draft'), patch: admin('Settings', 'Save settings draft', { requestBody: body('SettingsUpdate') }) },
    '/admin/settings/publish': { post: admin('Settings', 'Publish settings') },
    '/admin/users': { get: admin('Users', 'List admins (owner)'), post: admin('Users', 'Create admin (owner)', { requestBody: body('CreateAdmin') }) },
    '/admin/users/{id}': { patch: admin('Users', 'Change role/status (owner)', { parameters: [id], requestBody: body('UpdateAdmin') }) },
    '/admin/users/{id}/revoke-sessions': { post: admin('Users', 'Revoke all sessions of an admin (owner)', { parameters: [id] }) },
    '/admin/audit-logs': { get: admin('Audit', 'Audit log (owner)', { parameters: [...range, { name: 'action', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }] }) },
  },
} as const;
