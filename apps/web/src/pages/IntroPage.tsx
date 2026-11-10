import { Navigate, useSearchParams } from 'react-router';
import { useT } from '../i18n';
import { useCandidate, useSite } from '../services/public';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { INTRO_SEEN_KEY, IntroScreen } from '../components/intro/IntroScreen';

function introSeen() {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export default function IntroPage() {
  const t = useT();
  const [params] = useSearchParams();
  const site = useSite();
  const candidate = useCandidate();
  useDocumentMeta(`THE REVEAL — ${t.intro.heading}`, t.intro.body);

  const forced = params.get('intro') === '1';
  // Returning visitors (or a CMS switch) skip straight to the experience.
  if (!forced && (introSeen() || site.data?.introEnabled === false)) return <Navigate to="/vision" replace />;
  return <IntroScreen candidate={candidate.data} />;
}
