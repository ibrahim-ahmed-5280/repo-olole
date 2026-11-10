import { useT } from '../../i18n';

/** Thin top progress bar with an accessible progressbar role. Updates per milestone, not per pixel. */
export function RoadmapProgress({ value, current, total, color }: { value: number; current: number; total: number; color: string }) {
  const t = useT();
  const pct = Math.round(value * 100);
  return (
    <div className="fixed inset-x-0 top-0 z-30 h-1 bg-line/40">
      <div
        role="progressbar"
        aria-label={t.roadmap.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={total ? t.roadmap.progressText(current, total) : undefined}
        className="h-full origin-left transition-transform duration-500 ease-out"
        style={{ transform: `scaleX(${value})`, background: color, boxShadow: `0 0 12px ${color}` }}
      />
    </div>
  );
}
