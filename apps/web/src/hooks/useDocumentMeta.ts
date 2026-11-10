import { useEffect } from 'react';

const SITE_URL = (typeof __SITE_URL__ !== 'undefined' && __SITE_URL__) || '';

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/** Updates title, description, canonical and Open Graph tags for client-side routes. */
export function useDocumentMeta(title: string | undefined, description?: string) {
  useEffect(() => {
    if (!title) return;
    const full = title.includes('THE REVEAL') ? title : `${title} · THE REVEAL`;
    document.title = full;
    const origin = SITE_URL || window.location.origin;
    const url = `${origin.replace(/\/$/, '')}${window.location.pathname}`;
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="og:title"]', 'content', full);
    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
    }
  }, [title, description]);
}
