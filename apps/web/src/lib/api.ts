import type { ApiFailure, ApiSuccess } from '@reveal/shared';

export const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api/v1').replace(/\/$/, '');

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  keepalive?: boolean;
}

/** Fetch wrapper: JSON envelope, cookies, CSRF header on mutations, typed errors. */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: ApiSuccess<T>['meta'] }> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const csrf = readCookie('reveal_csrf');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      signal: opts.signal,
      keepalive: opts.keepalive,
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Network error');
  }
  const json = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;
  if (!res.ok || !json || json.ok === false) {
    const err = json && json.ok === false ? json.error : { code: 'HTTP_ERROR', message: res.statusText };
    throw new ApiRequestError(res.status, err.code, err.message, (err as { details?: unknown }).details);
  }
  return { data: json.data, meta: json.meta };
}

export const api = {
  get: <T,>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }).then((r) => r.data),
  getPaged: <T,>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T,>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }).then((r) => r.data),
  patch: <T,>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body }).then((r) => r.data),
  put: <T,>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PUT', body }).then((r) => r.data),
  del: <T,>(path: string) => apiRequest<T>(path, { method: 'DELETE' }).then((r) => r.data),
};
