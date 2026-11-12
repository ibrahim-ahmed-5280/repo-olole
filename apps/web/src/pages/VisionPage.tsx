import { Link, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import type { CandidateDTO, PillarDTO } from '@reveal/shared';
import { useT } from '../i18n';
import { useCandidate, usePillars } from '../services/public';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { SiteFooter, SiteHeader } from '../components/layout/PublicLayout';
import { InteractiveCandidate } from '../components/candidate/InteractiveCandidate';
import { PillarNavigation } from '../components/candidate/PillarNavigation';
import { BiographyPanel } from '../components/candidate/BiographyPanel';
import { ErrorState, Spinner } from '../components/ui/primitives';

/** Presentational view shared by the public page and the admin preview. */
export function VisionView({ candidate, pillars, linkPrefix = '', showReplay = true }: { candidate: CandidateDTO; pillars: PillarDTO[]; linkPrefix?: string; showReplay?: boolean }) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const aboutOpen = params.get('panel') === 'about';
  const openAbout = () => setParams((p) => {
    p.set('panel', 'about');
    return p;
  });
  const closeAbout = () => setParams((p) => {
    p.delete('panel');
    return p;
  }, { replace: true });

  return (
    <div className="hero-backdrop relative isolate min-h-dvh overflow-x-clip">
      <main id="main" className="mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-glow">{t.vision.eyebrow}</p>
          <h1 data-route-focus tabIndex={-1} className="mt-2 text-[clamp(1.6rem,4.5vw,2.75rem)] font-extrabold outline-none">{candidate.name}</h1>
        </motion.div>

        <motion.div
          className="mt-1 w-full px-0 sm:mt-0 sm:px-28 md:px-40"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <InteractiveCandidate candidate={candidate} pillars={pillars} onOpenAbout={openAbout} linkPrefix={linkPrefix} />
        </motion.div>

        <div className="mt-14 w-full sm:mt-20">
          <PillarNavigation pillars={pillars} onOpenAbout={openAbout} linkPrefix={linkPrefix} />
        </div>

        {showReplay && (
          <Link to="/?intro=1" className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-muted hover:text-ink">
            <Play className="size-4" aria-hidden />
            {t.vision.replayIntro}
          </Link>
        )}
      </main>
      <BiographyPanel candidate={candidate} open={aboutOpen} onClose={closeAbout} />
    </div>
  );
}

export default function VisionPage() {
  const candidate = useCandidate();
  const pillars = usePillars();
  useDocumentMeta(candidate.data ? `${candidate.data.name} — THE REVEAL` : undefined, candidate.data?.introduction || undefined);

  return (
    <>
      <SiteHeader />
      {candidate.isPending || pillars.isPending ? (
        <div className="grid min-h-dvh place-items-center"><Spinner /></div>
      ) : candidate.isError || pillars.isError ? (
        <div className="grid min-h-dvh place-items-center">
          <ErrorState onRetry={() => { void candidate.refetch(); void pillars.refetch(); }} />
        </div>
      ) : (
        <VisionView candidate={candidate.data} pillars={pillars.data} />
      )}
      <SiteFooter />
    </>
  );
}
