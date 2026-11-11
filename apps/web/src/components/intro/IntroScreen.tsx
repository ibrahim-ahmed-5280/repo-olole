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

/** Entrance choreography (seconds). Portrait drops in from above, then the "?" lands, then the CTA rises into place. */
export const INTRO_TIMING = {
  portrait: { duration: 1.1 },
  questionMark: { delay: 1.0 },
  cta: { delay: 0.7, duration: 0.5 },
};

/** Start offset above the final position: ~20% of the viewport height, clamped to 120–200px. */
function portraitDropOffset() {
  if (typeof window === 'undefined') return -160;
  return -Math.round(Math.min(200, Math.max(120, window.innerHeight * 0.2)));
}

/**
 * The mystery entrance.
 * Layout: a single centred column filling the viewport — brand row, heading, a LARGE framed portrait
 * that takes all remaining height, and the CTA directly beneath it. The portrait box is sized with
 * container-query units so it is as large as the available area allows without distortion:
 *   width = min(100cqw, 100cqh × aspect-ratio, 40rem)
 */
export function IntroScreen({ candidate }: { candidate: CandidateDTO | undefined }) {
  const t = useT();
  const navigate = useNavigate();
  const reduced = useReducedMotionPref();
  const [revealing, setRevealing] = useState(false);
  const [dropOffset] = useState(portraitDropOffset);
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

  const portrait = candidate?.portrait ?? null;
  // Face centre on the intro portrait (normalized, set in Admin → Candidate Profile).
  const focal = portrait ? candidate!.portraitFocal : { x: 0.5, y: 0.36 };
  const ratio = portrait ? portrait.width / portrait.height : 0.67;

  return (
    <main id="main" className="hero-backdrop grain relative isolate flex h-dvh flex-col overflow-hidden">
      <div aria-hidden className="ambient pointer-events-none absolute left-1/2 top-[22%] -z-10 size-[80vmin] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="ambient pointer-events-none absolute bottom-[-10%] right-[-10%] -z-10 size-[55vmin] rounded-full bg-brand-green/15 blur-3xl" />

      {/* Brand + skip */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-8">
        <span className="flex items-center gap-2 whitespace-nowrap font-display text-sm font-bold tracking-[0.2em] text-ink">
          <span aria-hidden className="grid size-8 place-items-center rounded-full border border-primary/40 bg-primary/10 text-glow">?</span>
          {/* On very narrow phones only the mark is shown so the row never wraps. */}
          <span className="max-[359px]:sr-only">THE REVEAL</span>
        </span>
        <Link
          to="/vision"
          onClick={() => {
            markIntroSeen();
            track({ type: 'intro_skip', route: '/' });
          }}
          className="glass inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-ink hover:border-primary/60"
        >
          {t.intro.skip}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      {/* Heading */}
      <motion.div
        className="shrink-0 px-4 pt-3 text-center sm:pt-4 [@media(max-height:560px)]:pt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        // Fades in just after the portrait has dropped past it (the ease-out covers most of the distance early).
        transition={{ duration: 0.6, delay: 0.55 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-glow sm:text-xs [@media(max-height:700px)]:hidden">{t.intro.eyebrow}</p>
        <h1 className="mx-auto mt-1.5 max-w-4xl text-[clamp(1.35rem,2.6vw+0.75rem,2.75rem)] font-extrabold tracking-tight text-ink [@media(max-height:560px)]:mt-0 [@media(max-height:560px)]:text-lg">
          {t.intro.heading}
        </h1>
      </motion.div>

      {/* Large centred portrait — fills all remaining height */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-3 sm:py-5 [@media(max-height:560px)]:py-1.5" style={{ containerType: 'size' }} data-testid="intro-stage">
        <div className="relative" style={{ width: `min(100cqw, calc(100cqh * ${ratio}), 40rem)` }} data-testid="intro-portrait">
          <CandidatePortrait
            image={portrait}
            alt={candidate ? `${t.intro.portraitAlt}: ${candidate.name}` : t.intro.portraitAlt}
            entrance
            entranceFrom="top"
            entranceOffset={dropOffset}
            entranceDuration={INTRO_TIMING.portrait.duration}
            priority
            masked="frame"
            sizes="(max-width: 640px) 90vw, 640px"
          >
            {/* Inside the moving portrait box: normalized to the image, so it stays on the face at any size. */}
            <MysteryQuestionMark visible={!revealing} focal={focal} size={0.36} delay={INTRO_TIMING.questionMark.delay} />
          </CandidatePortrait>
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

      {/* CTA beneath the portrait: rises gently into place after the portrait settles. */}
      <motion.div
        className="flex shrink-0 flex-col items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: INTRO_TIMING.cta.delay, duration: INTRO_TIMING.cta.duration, ease: [0.22, 1, 0.36, 1] }}
      >
        <Button
          size="lg"
          onClick={reveal}
          loading={revealing}
          aria-live="polite"
          className="w-full max-w-xs shadow-[0_14px_36px_-12px_rgba(26,133,86,0.55)] sm:w-auto sm:min-w-[17rem]"
          data-testid="intro-cta"
        >
          {revealing ? t.intro.revealing : t.intro.cta}
        </Button>
        <p className="max-w-md text-center text-sm text-muted [@media(max-height:740px)]:hidden">{t.intro.body}</p>
      </motion.div>
    </main>
  );
}
