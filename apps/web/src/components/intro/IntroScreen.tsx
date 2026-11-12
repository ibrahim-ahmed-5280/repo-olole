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
import { BrandMark } from '../layout/BrandMark';
import { LanguageSwitch } from '../layout/PublicLayout';

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
    <main id="main" className="hero-backdrop relative isolate flex h-dvh flex-col overflow-hidden">
      {/* Hormuud University brand + language + skip */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line/70 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:px-8">
        <BrandMark compactBelow360 textHiddenBelow={640} />
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <Link
          to="/vision"
          onClick={() => {
            markIntroSeen();
            track({ type: 'intro_skip', route: '/' });
          }}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink hover:border-primary/50 hover:bg-primary/5 sm:px-4"
        >
          <span className="max-[419px]:sr-only">{t.intro.skip}</span>
          <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
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
            masked="cutout"
            sizes="(max-width: 640px) 90vw, 640px"
          >
            {/* Inside the moving portrait box: normalized to the image, so it stays on the face at any size. */}
            <MysteryQuestionMark visible={!revealing} focal={focal} size={0.33} delay={INTRO_TIMING.questionMark.delay} />
          </CandidatePortrait>
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
          className="w-full max-w-xs sm:w-auto sm:min-w-[17rem]"
          data-testid="intro-cta"
        >
          {revealing ? t.intro.revealing : t.intro.cta}
        </Button>
        <p className="max-w-md text-center text-sm text-muted [@media(max-height:740px)]:hidden">{t.intro.body}</p>
      </motion.div>
    </main>
  );
}
