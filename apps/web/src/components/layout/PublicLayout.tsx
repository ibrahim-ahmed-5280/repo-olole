import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { Wrench } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSite } from '../../services/public';
import { track } from '../../lib/analytics';
import { MotionPreferenceProvider } from '../../lib/motion';

/** Sends one page_view per route per tab session (de-duplicated, safe under StrictMode). */
function RouteTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    track({ type: 'page_view', route: pathname });
  }, [pathname]);
  return null;
}

/** Restores scroll on navigation and announces the new page to screen readers. */
function RouteFocus() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    // Pages expose their main heading with data-route-focus; focus it for keyboard/AT users.
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>('[data-route-focus]');
      el?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(t);
  }, [pathname]);
  return null;
}

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t.language} className="glass flex rounded-full p-1 text-xs font-semibold">
      {(['so', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`min-h-9 min-w-11 rounded-full px-3 uppercase transition ${locale === l ? 'bg-primary/20 text-ink' : 'text-muted hover:text-ink'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const site = useSite();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/vision"
          className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full pr-2 font-display text-sm font-bold tracking-[0.2em] text-ink"
        >
          <span aria-hidden className="grid size-8 place-items-center rounded-full border border-primary/40 bg-primary/10 text-glow">?</span>
          <span>{site.data?.branding.siteName ?? 'THE REVEAL'}</span>
        </Link>
        {!minimal && (
          <div className="pointer-events-auto">
            <LanguageSwitch />
          </div>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  const site = useSite();
  return (
    <footer className="border-t border-line/60 bg-bg/80 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 text-sm text-muted sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl">{site.data?.branding.campaignContext}</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
          {site.data?.socialLinks.map((l) => (
            <a key={l.url} href={l.url} rel="noopener noreferrer" target="_blank" className="min-h-11 content-center underline-offset-4 hover:text-ink hover:underline">
              {l.label}
            </a>
          ))}
          <Link to="/privacy" className="min-h-11 content-center underline-offset-4 hover:text-ink hover:underline">
            {t.footer.privacy}
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-4 max-w-7xl text-xs text-muted/80">{t.footer.note}</p>
    </footer>
  );
}

export function PublicLayout() {
  const { t } = useI18n();
  const site = useSite();
  const animationsEnabled = site.data?.animationsEnabled ?? true;

  if (site.data?.maintenanceMode) {
    return (
      <main className="hero-backdrop grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-md">
          <Wrench className="mx-auto mb-4 size-10 text-glow" aria-hidden />
          <h1 className="text-2xl font-bold">{t.maintenanceTitle}</h1>
          <p className="mt-3 text-muted">{site.data.maintenanceMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <MotionPreferenceProvider animationsEnabled={animationsEnabled}>
      <a href="#main" className="sr-only-focusable fixed left-4 top-4 z-50 rounded-full bg-primary-strong px-4 py-2 text-white">
        {t.skipToContent}
      </a>
      <RouteTracker />
      <RouteFocus />
      <Outlet />
    </MotionPreferenceProvider>
  );
}
