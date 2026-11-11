import { useState } from 'react';
import { HOTSPOT_KEYS, computeRenderedBox, pointToAnchor, type HotspotKey, type PublicImage } from '@reveal/shared';
import { useElementSize } from '../../hooks/useElementSize';
import { cx } from '../../components/ui/primitives';
import { Field, TextInput } from './ui';
import { TOKENS } from '../../lib/theme';
import type { Anchor } from '../api';

const META: Record<HotspotKey, { label: string; color: string; hint: string }> = {
  education: { label: 'Waxbarasho', color: TOKENS.secondary, hint: "Candidate's RIGHT hand (viewer's left)" },
  unity: { label: 'Midnimo', color: TOKENS.brandGreen, hint: "Candidate's LEFT hand (viewer's right)" },
  leadership: { label: 'Hoggaan', color: TOKENS.teal, hint: 'In front of the candidate' },
  about: { label: 'About (?)', color: TOKENS.brandBlue, hint: 'Upper chest' },
};

type Key = HotspotKey;

/** Click on the photo to place the selected hotspot. Coordinates are stored normalized (0–1). */
export function HotspotEditor({ image, anchors, onChange }: { image: PublicImage | null; anchors: Record<HotspotKey, Anchor>; onChange: (a: Record<HotspotKey, Anchor>) => void }) {
  const [selected, setSelected] = useState<Key>('education');
  const [ref, size] = useElementSize<HTMLDivElement>();
  if (!image) return <p className="text-sm text-muted">Choose a pose photo first.</p>;
  const all: Record<Key, Anchor> = anchors;

  const set = (key: Key, a: Anchor) => onChange({ ...anchors, [key]: a });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div>
        <div
          ref={ref}
          className="relative cursor-crosshair overflow-hidden rounded-xl border border-line"
          style={{ aspectRatio: `${image.width} / ${image.height}` }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const box = computeRenderedBox({ width: image.width, height: image.height }, size, 'contain');
            set(selected, pointToAnchor({ x: e.clientX - r.left, y: e.clientY - r.top }, box));
          }}
        >
          <img src={image.variants.at(-1)?.url ?? image.url} alt="" className="h-full w-full object-contain" draggable={false} />
          {(Object.keys(all) as Key[]).map((k) => (
            <span
              key={k}
              aria-hidden
              className={cx('absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white', k === selected && 'ring-4 ring-white/40')}
              style={{ left: `${all[k].x * 100}%`, top: `${all[k].y * 100}%`, background: META[k].color }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Select a hotspot, then click the photo — or type exact values. Markers are 44px on the live site and are kept inside a safe margin.</p>
      </div>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Hotspot anchors</legend>
        <div className="space-y-3">
          {([...HOTSPOT_KEYS] as Key[]).map((k) => (
            <div key={k} className={cx('rounded-xl border p-3', k === selected ? 'border-primary bg-primary/5' : 'border-line')}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="radio" name="hotspot" checked={k === selected} onChange={() => setSelected(k)} className="size-4 accent-primary" />
                <span className="size-3 rounded-full" style={{ background: META[k].color }} aria-hidden />
                <span className="text-sm font-semibold">{META[k].label}</span>
                <span className="text-xs text-muted">{META[k].hint}</span>
              </label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(['x', 'y'] as const).map((axis) => (
                  <Field key={axis} label={`${axis.toUpperCase()} (0–1)`}>
                    {(id) => (
                      <TextInput
                        id={id}
                        type="number"
                        step={0.01}
                        min={0}
                        max={1}
                        value={all[k][axis]}
                        onChange={(e) => {
                          const v = Math.min(1, Math.max(0, Number(e.target.value)));
                          if (!Number.isNaN(v)) set(k, { ...all[k], [axis]: v });
                        }}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Click the intro portrait to set the face centre, where the mystery "?" is drawn. */
export function FacePointEditor({ image, value, onChange }: { image: PublicImage | null; value: Anchor; onChange: (a: Anchor) => void }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  if (!image) return <p className="text-sm text-muted">Choose an intro portrait first.</p>;
  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,14rem)_1fr]">
      <div
        ref={ref}
        className="relative cursor-crosshair overflow-hidden rounded-xl border border-line"
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const box = computeRenderedBox({ width: image.width, height: image.height }, size, 'contain');
          onChange(pointToAnchor({ x: e.clientX - r.left, y: e.clientY - r.top }, box));
        }}
      >
        <img src={image.variants.at(-1)?.url ?? image.url} alt="" className="h-full w-full object-contain" draggable={false} />
        <span aria-hidden className="absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-brand-blue/80 font-bold text-white" style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }}>?</span>
      </div>
      <div className="grid content-start gap-3">
        <p className="text-sm text-muted">Click the centre of the face. The intro "?" and its veil are drawn here.</p>
        <div className="grid grid-cols-2 gap-3">
          {(['x', 'y'] as const).map((axis) => (
            <Field key={axis} label={`${axis.toUpperCase()} (0–1)`}>
              {(id) => (
                <TextInput id={id} type="number" step={0.01} min={0} max={1} value={value[axis]}
                  onChange={(e) => { const v = Math.min(1, Math.max(0, Number(e.target.value))); if (!Number.isNaN(v)) onChange({ ...value, [axis]: v }); }} />
              )}
            </Field>
          ))}
        </div>
      </div>
    </div>
  );
}
