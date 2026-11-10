import type { AnalyticsEventType, HotspotKey, PillarSlug } from '@reveal/shared';
import { API_BASE } from './api';

/**
 * Privacy-respecting, first-party analytics.
 * - A random token is kept in sessionStorage (one per tab, gone when the tab closes).
 * - No cookies, no fingerprinting, no third parties.
 * - Each event is sent at most once per tab session (in-memory guard), which also prevents
 *   double counting from React re-renders / StrictMode. The server de-duplicates again.
 */
const SID_KEY = 'reveal.sid';
let memorySid: string | null = null;
const sent = new Set<string>();
let disabled = false;

export function disableAnalytics() {
  disabled = true;
}

function randomId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = randomId();
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    memorySid ??= randomId();
    return memorySid;
  }
}

export interface TrackInput {
  type: AnalyticsEventType;
  route: string;
  pillar?: PillarSlug;
  milestoneId?: string;
  target?: HotspotKey;
}

export function track(event: TrackInput): void {
  if (disabled || typeof window === 'undefined') return;
  if (event.route.startsWith('/admin')) return;
  const route = event.route.split('?')[0]!.replace(/[^a-z0-9\-/]/gi, '').slice(0, 120) || '/';
  const key = [event.type, route, event.pillar, event.milestoneId, event.target].join('|');
  if (sent.has(key)) return;
  sent.add(key);
  const body = JSON.stringify({ ...event, route, sid: getSessionId() });
  void fetch(`${API_BASE}/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => sent.delete(key));
}

/** Test helper. */
export function __resetAnalytics() {
  sent.clear();
  disabled = false;
}
