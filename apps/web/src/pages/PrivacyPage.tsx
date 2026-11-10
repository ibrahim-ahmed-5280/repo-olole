import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useT } from '../i18n';
import { useSite } from '../services/public';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { SiteFooter, SiteHeader } from '../components/layout/PublicLayout';
import { Spinner } from '../components/ui/primitives';

export default function PrivacyPage() {
  const t = useT();
  const site = useSite();
  useDocumentMeta(t.privacy.title);
  return (
    <>
      <SiteHeader />
      <main id="main" className="hero-backdrop min-h-dvh px-4 pb-20 pt-24 sm:px-6">
        <article className="mx-auto max-w-2xl">
          <Link to="/vision" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            {t.backHome}
          </Link>
          <h1 data-route-focus tabIndex={-1} className="mt-6 text-3xl font-bold outline-none">{t.privacy.title}</h1>
          {site.isPending ? <Spinner /> : <div className="glass mt-6 whitespace-pre-line rounded-[var(--radius-card)] p-6 leading-relaxed text-ink/90">{site.data?.privacyNotice}</div>}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
