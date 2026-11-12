import { useState } from 'react';
import { ArrowUp, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import type { MilestoneDTO } from '@reveal/shared';
import { useT } from '../../i18n';
import { cx } from '../ui/primitives';
import { TOKENS } from '../../lib/theme';

interface Props {
  milestones: MilestoneDTO[];
  activeIndex: number;
  reached: number;
  color: string;
  onGo: (index: number) => void;
  onTop: () => void;
  shareTitle: string;
}

const iconBtn =
  'grid size-11 place-items-center rounded-full text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-35';

/** Floating bottom control bar + desktop milestone rail. Native scrolling is never hijacked. */
export function RoadmapControls({ milestones, activeIndex, reached, color, onGo, onTop, shareTitle }: Props) {
  const t = useT();
  const [shared, setShared] = useState(false);
  const total = milestones.length;

  const share = async () => {
    const url = window.location.href.split('#')[0]!;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 2500);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      {/* Desktop milestone rail */}
      {total > 0 && (
        <nav aria-label={t.roadmap.milestoneNav} className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 xl:block">
          <ol className="glass flex flex-col gap-1 rounded-full p-1.5">
            {milestones.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onGo(i)}
                  aria-label={t.roadmap.goTo(i + 1, m.title)}
                  aria-current={i === activeIndex ? 'step' : undefined}
                  className="group grid size-9 place-items-center rounded-full"
                >
                  <span
                    className={cx('block rounded-full transition-all', i === activeIndex ? 'size-3' : 'size-2')}
                    style={{ background: i <= reached ? color : TOKENS.lineStrong, boxShadow: i === activeIndex ? `0 0 10px ${color}` : undefined }}
                  />
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Bottom bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="glass pointer-events-auto flex items-center gap-1 rounded-full border-line/90 bg-surface p-1 shadow-[0_2px_10px_-4px_rgb(22_43_37/0.14)]" role="group" aria-label={t.roadmap.milestoneNav}>
          <button type="button" className={iconBtn} onClick={() => onGo(activeIndex - 1)} disabled={activeIndex <= 0} aria-label={t.roadmap.prev} data-testid="prev-milestone">
            <ChevronUp className="size-5" aria-hidden />
          </button>
          <span className="min-w-28 px-2 text-center text-xs font-semibold tabular-nums text-muted" aria-live="polite" data-testid="progress-text">
            {total ? t.roadmap.progressText(Math.min(total, activeIndex + 1), total) : '—'}
          </span>
          <button type="button" className={iconBtn} onClick={() => onGo(activeIndex + 1)} disabled={activeIndex >= total - 1} aria-label={t.roadmap.next} data-testid="next-milestone">
            <ChevronDown className="size-5" aria-hidden />
          </button>
          <span aria-hidden className="mx-1 h-6 w-px bg-line" />
          <button type="button" className={iconBtn} onClick={onTop} aria-label={t.roadmap.toTop}>
            <ArrowUp className="size-5" aria-hidden />
          </button>
          <button type="button" className={iconBtn} onClick={share} aria-label={t.roadmap.share}>
            <Share2 className="size-5" aria-hidden />
          </button>
          <span className="sr-only" role="status">{shared ? t.roadmap.shared : ''}</span>
        </div>
      </div>
      {shared && (
        <div aria-hidden className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-line bg-surface px-4 py-2 text-sm">
          {t.roadmap.shared}
        </div>
      )}
    </>
  );
}
