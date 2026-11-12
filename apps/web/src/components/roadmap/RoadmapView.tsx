import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, MessageSquareText } from 'lucide-react';
import { otherPillars, roadmapProgress, type PillarDTO, type RoadmapDTO } from '@reveal/shared';
import { useT } from '../../i18n';
import { track } from '../../lib/analytics';
import { useReducedMotionPref } from '../../lib/motion';
import { PILLAR_THEME, themeStyle } from '../../lib/theme';
import { FeedbackForm, wasSubmitted } from '../feedback/FeedbackForm';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { RoadmapControls } from './RoadmapControls';
import { RoadmapMilestone } from './RoadmapMilestone';
import { RoadmapPath } from './RoadmapPath';
import { RoadmapProgress } from './RoadmapProgress';

interface Props {
  roadmap: RoadmapDTO;
  pillars: PillarDTO[];
  /** Admin preview: no analytics, no feedback submission. */
  preview?: boolean;
  linkPrefix?: string;
}

const HEADER_ART: Record<RoadmapDTO['theme'], string> = {
  education: 'M0 60 Q 60 0 120 60 T 240 60',
  unity: 'M0 40 C 60 80, 120 0, 180 40 S 240 80, 300 40',
  leadership: 'M120 0 L135 45 L180 60 L135 75 L120 120 L105 75 L60 60 L105 45 Z',
};

export function RoadmapView({ roadmap, pillars, preview, linkPrefix = '' }: Props) {
  const t = useT();
  const reduced = useReducedMotionPref();
  const theme = PILLAR_THEME[roadmap.theme];
  const pathRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const conclusionRef = useRef<HTMLElement>(null);
  /** Sentinel right after the last milestone: reaching it means the visitor scrolled through every milestone. */
  const endRef = useRef<HTMLDivElement>(null);
  const [finished, setFinished] = useState(false);
  const [active, setActive] = useState(0);
  const [reached, setReached] = useState(-1);
  const [complete, setComplete] = useState(false);
  /** While a programmatic (prev/next) scroll is running, observer updates are ignored so they can't override the target. */
  const navLockUntil = useRef(0);
  const total = roadmap.milestones.length;
  const route = `/roadmap/${roadmap.slug}`;
  const [submitted, setSubmitted] = useState(() => wasSubmitted(roadmap.slug));
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useEffect(() => setSubmitted(wasSubmitted(roadmap.slug)), [roadmap.slug]);

  /*
   * Automatic feedback — fully independent per pillar.
   * Each pillar has its own session key (feedback_auto_shown_waxbarasho / _midnimo / _hoggaan) and its own
   * "submitted" key, so finishing, dismissing or submitting one pillar never affects another.
   * The key is written only at the moment the popup actually opens, so re-renders can't swallow the popup.
   */
  const autoShownKey = `feedback_auto_shown_${roadmap.slug}`;
  const autoShownRef = useRef(false); // fallback when sessionStorage is unavailable
  const alreadyAutoShown = useCallback(() => {
    if (autoShownRef.current) return true;
    try {
      return sessionStorage.getItem(autoShownKey) === '1';
    } catch {
      return false;
    }
  }, [autoShownKey]);
  const shouldPrompt = (finished || complete) && !preview && !submitted;
  useEffect(() => {
    if (!shouldPrompt || alreadyAutoShown()) return;
    const id = window.setTimeout(() => {
      if (alreadyAutoShown()) return;
      autoShownRef.current = true;
      try {
        sessionStorage.setItem(autoShownKey, '1');
      } catch {
        /* ignore */
      }
      setFeedbackOpen(true);
    }, reduced ? 0 : 350);
    return () => window.clearTimeout(id);
  }, [shouldPrompt, alreadyAutoShown, autoShownKey, reduced]);

  // Detect the end of the actual final milestone (any number of milestones). Only real scrolling counts —
  // never page load — and fast scrolls are caught because we test "end is at or above the viewport bottom".
  useEffect(() => {
    if (finished || total === 0) return;
    const check = () => {
      const el = endRef.current;
      if (el && el.getBoundingClientRect().top <= window.innerHeight) setFinished(true);
    };
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [finished, total]);

  useEffect(() => {
    if (!preview) track({ type: 'roadmap_view', route, pillar: roadmap.slug });
  }, [preview, route, roadmap.slug]);

  // Active milestone = the one crossing the middle band of the viewport.
  useEffect(() => {
    const items = itemRefs.current.filter(Boolean) as HTMLLIElement[];
    if (!items.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (Date.now() < navLockUntil.current) return;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const idx = Number((e.target as HTMLElement).dataset.index);
          setActive(idx);
          setReached((r) => Math.max(r, idx));
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [total]);

  useEffect(() => {
    const m = roadmap.milestones[active];
    if (!preview && m && reached >= 0) track({ type: 'milestone_view', route, pillar: roadmap.slug, milestoneId: m.id });
  }, [active, reached, preview, roadmap.milestones, roadmap.slug, route]);

  // Completion: the conclusion section came into view.
  useEffect(() => {
    const el = conclusionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setComplete(true);
          setReached(total - 1);
          if (!preview) track({ type: 'roadmap_complete', route, pillar: roadmap.slug });
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [preview, route, roadmap.slug, total]);

  const go = useCallback(
    (index: number) => {
      const el = itemRefs.current[index];
      if (!el) return;
      navLockUntil.current = Date.now() + (reduced ? 150 : 900);
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      setActive(index);
      setReached((r) => Math.max(r, index));
      el.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    },
    [reduced],
  );

  const progress = complete ? 1 : roadmapProgress(reached + 1, total + 1);
  const others = otherPillars(roadmap.slug)
    .map((s) => pillars.find((p) => p.slug === s))
    .filter((p): p is PillarDTO => !!p);

  return (
    <div style={themeStyle(roadmap.theme)} className="relative">
      <RoadmapProgress value={progress} current={Math.min(total, active + 1)} total={total} color={theme.color} />

      <header className="relative isolate overflow-hidden px-4 pb-10 pt-24 sm:px-6 sm:pt-28">
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[32rem]" style={{ background: `radial-gradient(60% 60% at 50% 0%, ${theme.soft.replace('0.10', '0.06')}, transparent 70%)` }} />
        <svg aria-hidden viewBox="0 0 300 120" className="absolute right-[-4rem] top-24 -z-10 hidden w-[28rem] opacity-25 md:block" fill="none" stroke={theme.color} strokeWidth="1.5">
          <path d={HEADER_ART[roadmap.theme]} />
        </svg>
        <div className="mx-auto max-w-5xl">
          <Link to={`${linkPrefix}/vision`} className="inline-flex min-h-11 items-center gap-2 rounded-full pr-3 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            {t.roadmap.back}
          </Link>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mt-6 max-w-3xl">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: theme.color }}>
              <span className="grid size-10 place-items-center rounded-full" style={{ background: theme.soft }}>
                <Icon name={roadmap.icon} className="size-5" />
              </span>
              {roadmap.subtitle}
            </p>
            <h1 data-route-focus tabIndex={-1} className="mt-4 text-[clamp(2.5rem,9vw,5rem)] font-extrabold tracking-[0.06em] outline-none" style={{ color: theme.color }}>
              {roadmap.name}
            </h1>
            {roadmap.tagline && <p className="mt-3 text-xl font-medium text-ink sm:text-2xl">{roadmap.tagline}</p>}
            {roadmap.description && <p className="mt-4 max-w-2xl whitespace-pre-line text-muted">{roadmap.description}</p>}
          </motion.div>
        </div>
      </header>

      <main id="main" className="px-4 pb-40 sm:px-6">
        {total === 0 ? (
          <p className="mx-auto max-w-xl rounded-2xl border border-dashed border-line p-8 text-center text-muted">{t.roadmap.empty}</p>
        ) : (
          <div className="relative mx-auto max-w-5xl">
            <ol ref={pathRef} className="relative z-10" aria-label={t.roadmap.milestoneNav}>
              {roadmap.milestones.map((m, i) => (
                <RoadmapMilestone
                  key={m.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  milestone={m}
                  index={i}
                  total={total}
                  variant={roadmap.theme}
                  color={theme.color}
                  state={i === active ? 'active' : i <= reached ? 'done' : 'upcoming'}
                />
              ))}
            </ol>
            <div ref={endRef} aria-hidden className="h-px w-full" data-testid="milestones-end" />
            {/* Rendered after the list so the list's ref exists when the path measures it; z-0 keeps it behind the cards. */}
            <RoadmapPath containerRef={pathRef} variant={roadmap.theme} color={theme.color} milestoneCount={total} />
          </div>
        )}

        <section ref={conclusionRef} aria-labelledby="conclusion-heading" className="mx-auto mt-16 max-w-3xl" data-testid="roadmap-conclusion">
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full" style={{ background: theme.soft, color: theme.color }}>
              <Flag className="size-6" aria-hidden />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted">{t.roadmap.conclusionEyebrow}</p>
            <h2 id="conclusion-heading" className="mt-2 text-2xl font-bold sm:text-3xl">
              {t.roadmap.completed}: {roadmap.name}
            </h2>
            {roadmap.conclusion && <p className="mx-auto mt-3 max-w-xl text-muted">{roadmap.conclusion}</p>}
          </div>

          <div className="mt-10 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6" data-testid="feedback-card">
            {submitted ? (
              <p className="flex items-center gap-3 font-semibold" data-testid="feedback-success">
                <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden />
                {t.feedback.success}
              </p>
            ) : (
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: theme.soft, color: theme.color }}>
                    <MessageSquareText className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">{t.feedback.heading}</h3>
                    <p className="mt-0.5 text-sm text-muted">{t.feedback.question}</p>
                  </div>
                </div>
                <Button onClick={() => setFeedbackOpen(true)} className="w-full sm:w-auto" data-testid="feedback-open">
                  {t.feedback.open}
                </Button>
              </div>
            )}
          </div>

          <nav aria-labelledby="others-heading" className="mt-12">
            <h2 id="others-heading" className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-muted">{t.roadmap.others}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {others.map((p) => {
                const th = PILLAR_THEME[p.theme];
                return (
                  <li key={p.slug}>
                    <Link to={`${linkPrefix}/roadmap/${p.slug}`} className="glass group flex min-h-20 items-center gap-4 rounded-[var(--radius-card)] p-4" style={{ borderColor: `${th.color}55` }} data-testid={`other-${p.slug}`}>
                      <span className="grid size-11 place-items-center rounded-full" style={{ background: th.soft, color: th.color }}>
                        <Icon name={p.icon} className="size-5" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-display font-bold tracking-[0.12em]" style={{ color: th.color }}>{p.name}</span>
                        <span className="block text-sm text-muted">{p.tagline}</span>
                      </span>
                      <ArrowRight className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-ink" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 text-center">
              <Link to={`${linkPrefix}/vision`} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold text-muted hover:text-ink">
                <ArrowLeft className="size-4" aria-hidden />
                {t.backHome}
              </Link>
            </div>
          </nav>
        </section>
      </main>

      <Dialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title={`${t.feedback.popupTitle} — ${roadmap.name}`}
        closeLabel={t.about.close}
        side="center"
        testId="feedback-dialog"
      >
        <FeedbackForm
          pillar={roadmap.slug}
          disabled={preview}
          variant="dialog"
          onSkip={() => setFeedbackOpen(false)}
          onSubmitted={() => setSubmitted(true)}
        />
      </Dialog>

      <RoadmapControls
        milestones={roadmap.milestones}
        activeIndex={active}
        reached={reached}
        color={theme.color}
        onGo={go}
        onTop={() => {
          window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
          document.querySelector<HTMLElement>('[data-route-focus]')?.focus({ preventScroll: true });
        }}
        shareTitle={`${roadmap.name} · THE REVEAL`}
      />
    </div>
  );
}
