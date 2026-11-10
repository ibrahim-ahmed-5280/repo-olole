import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../ui/primitives';

export type ChipSide = 'left' | 'right' | 'below';

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
}

/**
 * A 44×44 (min) interactive marker anchored to a normalized point on the portrait.
 * Works with hover, keyboard focus and touch; never relies on hover alone.
 */
export function HotspotMarker({ leftPct, topPct, color, glow, label, preview, icon, chip, chipSide = 'right', compact, number, to, onActivate, testId }: Props) {
  const previewId = useId();
  const content = (
    <>
      <span aria-hidden className="ring-pulse absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${color}` }} />
      <span
        aria-hidden
        className="relative grid size-11 place-items-center rounded-full border-2 bg-bg/80 backdrop-blur transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-110"
        style={{ borderColor: color, color, boxShadow: `0 0 22px ${glow}` }}
      >
        {icon}
        {compact && number !== undefined && (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full text-[10px] font-bold text-bg" style={{ background: color }}>
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
          )}
        >
          {chip}
        </span>
      )}
      {preview && (
        <span
          id={previewId}
          role="tooltip"
          className="glass pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-1/2 z-20 w-56 -translate-x-1/2 rounded-xl px-3 py-2 text-left text-xs leading-snug text-ink opacity-0 shadow-xl transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
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
