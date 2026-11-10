import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { CandidateDTO } from '@reveal/shared';
import { useT } from '../../i18n';
import { track } from '../../lib/analytics';
import { useReducedMotionPref } from '../../lib/motion';
import { Button } from '../ui/primitives';
import { CandidatePortrait } from './CandidatePortrait';
import { MysteryQuestionMark } from './MysteryQuestionMark';

export const INTRO_SEEN_KEY = 'reveal.introSeen';

export function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** The mystery entrance: portrait rises in, "?" veils the face, CTA reveals and navigates. */
export function IntroScreen({ candidate }: { candidate: CandidateDTO | undefined }) {
  const t = useT();
  const navigate = useNavigate();
  const reduced = useReducedMotionPref();
  const [revealing, setRevealing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const reveal = () => {
    if (revealing) return; // duplicate-navigation guard
    setRevealing(true);
    markIntroSeen();
    track({ type: 'intro_reveal', route: '/' });
    // Navigation never waits for an animation callback; a fixed, short delay lets the reveal play.
    timer.current = window.setTimeout(() => navigate('/vision', { state: { fromIntro: true } }), reduced ? 0 : 1100);
  };

  const focal = candidate?.pose && candidate.portrait ? candidate.pose.focal : { x: 0.5, y: 0.33 };

  return (
    <main id="main" className="hero-backdrop grain relative isolate flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="ambient pointer-events-none absolute left-1/2 top-[18%] -z-10 size-[70vmin] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <div className="flex justify-end px-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8">
        <Link
          to="/vision"
          onClick={() => {
            markIntroSeen();
            track({ type: 'intro_skip', route: '/' });
          }}
          className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink hover:border-primary/60"
        >
          {t.intro.skip}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 sm:gap-6 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:flex-row lg:gap-16 lg:px-8">
        <div className="relative w-[min(78vw,26rem,34dvh)] [@media(max-height:680px)]:w-[24dvh] shrink-0 lg:order-2 lg:w-[min(28rem,56dvh)]">
          <div className="relative">
            <CandidatePortrait image={candidate?.portrait ?? null} alt={candidate ? `${t.intro.portraitAlt}: ${candidate.name}` : t.intro.portraitAlt} entrance priority />
            <MysteryQuestionMark visible={!revealing} focal={focal} />
            {revealing && !reduced && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-glow/20 blur-3xl"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.6, 1.1, 1.4] }}
                transition={{ duration: 1.1 }}
              />
            )}
          </div>
        </div>

        <motion.div
          className="max-w-xl text-center lg:order-1 lg:text-left"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-glow [@media(max-height:680px)]:mb-2">{t.intro.eyebrow}</p>
          <h1 className="text-[clamp(2rem,7vw,4.25rem)] font-extrabold [@media(max-height:680px)]:text-[1.65rem] tracking-tight text-ink">{t.intro.heading}</h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted lg:mx-0 [@media(max-height:680px)]:mt-2 [@media(max-height:680px)]:text-sm">{t.intro.body}</p>
          <div className="mt-8 flex flex-col items-center gap-3 lg:items-start [@media(max-height:680px)]:mt-4">
            <Button size="lg" onClick={reveal} loading={revealing} aria-live="polite" className="w-full max-w-xs sm:w-auto">
              {revealing ? t.intro.revealing : t.intro.cta}
            </Button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
