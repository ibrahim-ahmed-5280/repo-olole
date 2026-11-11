import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../ui/primitives';
import { TOKENS } from '../../lib/theme';

export type ChipSide = 'left' | 'right' | 'below' | 'above';

interface Props {
  leftPct: number;
  topPct: number;
  color: string;
  glow: string;
  /** Accessible name for the control. */
  label: string;
  /** Short preview revealed on hover / focus. */
  preview?: string;
  icon: ReactNode;
  chip?: ReactNode;
  chipSide?: ChipSide;
  compact: boolean;
  number?: number;
  to?: string;
  onActivate?: () => void;
  testId?: string;
  /** Larger marker with a Hormuud blue→green ring (used for the central Hoggaan pillar). */
  emphasis?: boolean;
}

/**
 * A 44×44 (min) interactive marker anchored to a normalized point on the portrait.
 * Works with hover, keyboard focus and touch; never relies on hover alone.
 */
export function HotspotMarker({ leftPct, topPct, color, glow, label, preview, icon, chip, chipSide = 'right', compact, number, to, onActivate, testId, emphasis }: Props) {
  const previewId = useId();
  const content = (
    <>
      <span aria-hidden className="ring-pulse absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${color}` }} />
      <span
        aria-hidden
        className={cx(
          'relative grid place-items-center rounded-full border-2 bg-surface/95 shadow-[var(--shadow-card)] backdrop-blur transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-110',
          emphasis ? 'size-14' : 'size-12', // ≥ 48px touch targets
        )}
        style={
          emphasis
            ? {
                borderColor: 'transparent',
                color,
                background: `linear-gradient(${TOKENS.surface}, ${TOKENS.surface}) padding-box, linear-gradient(135deg, ${TOKENS.brandGreen}, ${TOKENS.brandBlue}) border-box`,
                boxShadow: `0 6px 20px -6px ${glow}, 0 0 0 6px rgba(26,133,86,0.08)`,
              }
            : { borderColor: color, color, boxShadow: `0 6px 18px -6px ${glow}` }
        }
      >
        {icon}
        {compact && number !== undefined && (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>
            {number}
          </span>
        )}
      </span>
      {!compact && chip && (
        <span
          aria-hidden
          className={cx(
            'pointer-events-none absolute whitespace-nowrap',
            chipSide === 'left' && 'right-[calc(100%+0.6rem)] top-1/2 -translate-y-1/2',
            chipSide === 'right' && 'left-[calc(100%+0.6rem)] top-1/2 -translate-y-1/2',
            chipSide === 'below' && 'left-1/2 top-[calc(100%+0.5rem)] -translate-x-1/2',
            chipSide === 'above' && 'bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2',
          )}
        >
          {chip}
        </span>
      )}
      {preview && (
        <span
          id={previewId}
          role="tooltip"
          className={cx(
            'glass pointer-events-none absolute left-1/2 z-20 w-56 -translate-x-1/2 rounded-xl px-3 py-2 text-left text-xs leading-snug text-ink opacity-0 shadow-xl transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100',
            // Keep the preview clear of the label: below when the label sits above the hand.
            chipSide === 'above' && !compact ? 'top-[calc(100%+0.75rem)]' : 'bottom-[calc(100%+0.75rem)]',
          )}
        >
          {preview}
        </span>
      )}
    </>
  );
  const className = 'group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full outline-offset-4';
  const style = { left: `${leftPct}%`, top: `${topPct}%` };
  if (to) {
    return (
      <Link to={to} className={className} style={style} aria-label={label} aria-describedby={preview ? previewId : undefined} onClick={onActivate} data-testid={testId}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={className} style={style} aria-label={label} aria-describedby={preview ? previewId : undefined} onClick={onActivate} data-testid={testId}>
      {content}
    </button>
  );
}
