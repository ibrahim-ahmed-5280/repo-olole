import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../ui/primitives';

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
      <span
        aria-hidden
        className={cx(
          // Flat, product-style marker: white disc, thin coloured ring, soft halo ring (no glow, no pulse).
          'relative grid place-items-center rounded-full border-2 bg-surface transition duration-200 group-hover:scale-105 group-focus-visible:scale-105',
          emphasis ? 'size-13' : 'size-12', // ≥ 48px touch targets
        )}
        style={{ borderColor: color, color, boxShadow: `0 1px 3px rgb(22 43 37 / 0.12), 0 0 0 5px ${glow.replace(/[\d.]+\)$/, '0.14)')}` }}
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
            'absolute whitespace-nowrap', // part of the control: a larger tap target
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
            'pointer-events-none absolute left-1/2 z-20 w-56 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-xs leading-snug text-ink opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100',
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
