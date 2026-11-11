import { forwardRef, useId, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import type { MilestoneDTO, PillarTheme } from '@reveal/shared';
import { useT } from '../../i18n';
import { responsiveImage } from '../../lib/images';
import { useReducedMotionPref } from '../../lib/motion';
import { TOKENS } from '../../lib/theme';
import { Icon } from '../ui/Icon';
import { Badge, cx } from '../ui/primitives';

interface Props {
  milestone: MilestoneDTO;
  index: number;
  total: number;
  variant: PillarTheme;
  color: string;
  state: 'upcoming' | 'active' | 'done';
}

function NodeShape({ variant, color, state, index }: { variant: PillarTheme; color: string; state: Props['state']; index: number }) {
  const filled = state !== 'upcoming';
  const base = 'relative grid size-12 place-items-center border-2 font-display text-sm font-bold transition-colors duration-300';
  const shape = variant === 'education' ? 'rounded-xl' : variant === 'leadership' ? 'rotate-45 rounded-md' : 'rounded-full';
  return (
    <span data-node className="relative grid size-12 place-items-center">
      {state === 'active' && <span aria-hidden className="ring-pulse absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${color}` }} />}
      <span
        className={cx(base, shape)}
        style={{
          borderColor: filled ? color : TOKENS.lineStrong,
          background: filled ? color : TOKENS.surface,
          color: filled ? '#FFFFFF' : TOKENS.muted,
          boxShadow: state === 'active' ? `0 0 28px ${color}88` : undefined,
        }}
      >
        <span className={variant === 'leadership' ? '-rotate-45' : ''}>
          {state === 'done' ? <Check className="size-5" aria-hidden /> : String(index + 1).padStart(2, '0')}
        </span>
      </span>
    </span>
  );
}

/** A single milestone: node on the path + card with expandable details. */
export const RoadmapMilestone = forwardRef<HTMLLIElement, Props>(function RoadmapMilestone({ milestone: m, index, total, variant, color, state }, ref) {
  const t = useT();
  const reduced = useReducedMotionPref();
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const headingId = `milestone-${m.id}`;
  const leftSide = index % 2 === 0;
  const details: Array<[string, string]> = [
    [t.roadmap.problem, m.problem],
    [t.roadmap.solution, m.solution],
    [t.roadmap.implementation, m.implementation],
    [t.roadmap.benefit, m.expectedBenefit],
    [t.roadmap.timeframe, m.timeframe],
  ].filter(([, v]) => !!v) as Array<[string, string]>;
  const hasDetails = !!m.description || details.length > 0 || !!m.illustration;
  const img = m.illustration ? responsiveImage(m.illustration, '(max-width: 768px) 90vw, 420px') : null;

  return (
    <li
      ref={ref}
      data-index={index}
      aria-labelledby={headingId}
      className="relative grid grid-cols-[3rem_1fr] items-start gap-x-4 py-8 md:grid-cols-[1fr_5rem_1fr] md:gap-x-6 md:py-14"
      aria-current={state === 'active' ? 'step' : undefined}
    >
      <div className={cx('col-start-1 row-start-1 flex justify-center pt-4 md:col-start-2')}>
        <NodeShape variant={variant} color={color} state={state} index={index} />
      </div>

      <motion.article
        initial={reduced ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cx(
          'glass col-start-2 row-start-1 rounded-[var(--radius-card)] p-5 sm:p-6',
          leftSide ? 'md:col-start-1 md:text-right' : 'md:col-start-3',
          state === 'active' && 'border-[color:var(--accent)]/60 shadow-[0_20px_60px_-25px_var(--accent-glow)]',
        )}
      >
        <div className={cx('flex items-center gap-3', leftSide && 'md:flex-row-reverse')}>
          <span className="font-display text-4xl font-extrabold leading-none text-[color:var(--accent)]/30 md:text-5xl" aria-hidden>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="grid size-10 place-items-center rounded-full" style={{ background: 'var(--accent-soft)', color }}>
            <Icon name={m.icon} className="size-5" />
          </span>
          {m.isExample && (
            <Badge className="border-warn/50 text-warn" title={t.roadmap.exampleHint}>
              {t.roadmap.example}
            </Badge>
          )}
        </div>
        <h3 id={headingId} tabIndex={-1} className="mt-4 text-xl font-bold outline-none sm:text-2xl">
          <span className="sr-only">{t.roadmap.progressText(index + 1, total)}: </span>
          {m.title}
        </h3>
        {m.summary && <p className="mt-2 text-[15px] leading-relaxed text-muted">{m.summary}</p>}

        {hasDetails && (
          <>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((o) => !o)}
              className={cx('mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-[color:var(--accent)] hover:underline', leftSide && 'md:flex-row-reverse')}
            >
              {open ? t.roadmap.hideDetails : t.roadmap.details}
              <ChevronDown className={cx('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
            </button>
            <div id={detailsId} hidden={!open} className="mt-2 space-y-4 text-left">
              {img && (
                <picture>
                  {img.webpSrcSet && <source type="image/webp" srcSet={img.webpSrcSet} sizes={img.sizes} />}
                  <img src={img.src} width={img.width} height={img.height} alt={m.illustration!.altText} loading="lazy" decoding="async" className="h-auto w-full rounded-xl" />
                </picture>
              )}
              {m.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{m.description}</p>}
              {details.length > 0 && (
                <dl className="grid gap-3">
                  {details.map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-line bg-elevated p-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--accent)]">{label}</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm text-ink/90">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </>
        )}
      </motion.article>
    </li>
  );
});
