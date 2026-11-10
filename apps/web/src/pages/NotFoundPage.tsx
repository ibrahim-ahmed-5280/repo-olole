import { Link } from 'react-router';
import { useT } from '../i18n';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function NotFoundPage() {
  const t = useT();
  useDocumentMeta(t.notFoundTitle);
  return (
    <main id="main" className="hero-backdrop grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="font-display text-7xl font-extrabold text-glow/80" aria-hidden>?</p>
        <h1 data-route-focus tabIndex={-1} className="mt-4 text-2xl font-bold outline-none">{t.notFoundTitle}</h1>
        <p className="mt-2 text-muted">{t.notFoundBody}</p>
        <Link to="/vision" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary-strong px-5 font-semibold text-white">
          {t.backHome}
        </Link>
      </div>
    </main>
  );
}
