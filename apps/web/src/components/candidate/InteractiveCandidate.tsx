import { useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  HOTSPOT_TO_PILLAR,
  mapAnchor,
  markersOverlap,
  type CandidateDTO,
  type HotspotKey,
  type PillarDTO,
} from '@reveal/shared';
import { useT } from '../../i18n';
import { track } from '../../lib/analytics';
import { BRAND, PILLAR_THEME } from '../../lib/theme';
import { useElementSize } from '../../hooks/useElementSize';
import { CandidatePortrait } from '../intro/CandidatePortrait';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/primitives';
import { HotspotMarker, type ChipSide } from './HotspotMarker';

const SAFE_INSET = 28; // keeps 44–56px markers inside the frame
/** Below this viewport width there is no room for floating labels: markers become numbered and the grid below carries the labels. */
const COMPACT_VIEWPORT = '(max-width: 639px)';
const COMPACT_PORTRAIT_BELOW = 260; // px of portrait width

/*
 * Label placement around the arms-open photo:
 * - WAXBARASHO sits on the candidate's anatomical RIGHT palm (viewer's left), label above the hand.
 * - MIDNIMO sits on the LEFT palm (viewer's right), label above the hand — mirrors Waxbarasho.
 * - HOGGAAN sits in front of the candidate between the hands, as the emphasised central card.
 */
const CHIP_SIDE: Record<Exclude<HotspotKey, 'about'>, ChipSide> = {
  education: 'above',
  unity: 'above',
  leadership: 'below',
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const on = () => setMatches(mql.matches);
    on();
    mql.addEventListener?.('change', on);
    return () => mql.removeEventListener?.('change', on);
  }, [query]);
  return matches;
}

interface Props {
  candidate: CandidateDTO;
  pillars: PillarDTO[];
  onOpenAbout: () => void;
  linkPrefix?: string;
}

/**
 * The interactive candidate: hotspots are positioned from normalized image anchors
 * (configurable in the admin) and re-mapped on every resize, so they stay glued to the
 * candidate's hands/chest at any viewport size.
 */
export function InteractiveCandidate({ candidate, pillars, onOpenAbout, linkPrefix = '' }: Props) {
  const t = useT();
  const [ref, size] = useElementSize<HTMLDivElement>();
  const narrowViewport = useMediaQuery(COMPACT_VIEWPORT);
  const image = candidate.pose.image ?? candidate.portrait;
  const natural = image ? { width: image.width, height: image.height } : { width: 4, height: 5 };

  const points = useMemo(() => {
    const entries = (Object.keys(candidate.pose.anchors) as HotspotKey[]).map((key) => [
      key,
      mapAnchor(candidate.pose.anchors[key], natural, size, 'contain', { x: 0.5, y: 0.5 }, SAFE_INSET),
    ] as const);
    return Object.fromEntries(entries) as Record<HotspotKey, ReturnType<typeof mapAnchor>>;
  }, [candidate.pose.anchors, natural.width, natural.height, size]); // eslint-disable-line react-hooks/exhaustive-deps

  const compact = size.width > 0 && (narrowViewport || size.width < COMPACT_PORTRAIT_BELOW || markersOverlap(Object.values(points), 52));
  const pillarBySlug = new Map(pillars.map((p) => [p.slug, p]));
  const ready = size.width > 0;

  return (
    <div className="relative mx-auto w-full max-w-[34rem]" style={{ maxWidth: `min(34rem, calc(76dvh * ${natural.width / natural.height}))` }}>
      <div ref={ref} className="relative w-full" style={{ aspectRatio: `${natural.width} / ${natural.height}` }}>
        <CandidatePortrait image={image} alt={`${t.intro.portraitAlt}: ${candidate.name}`} priority masked="frame" sizes="(max-width: 640px) 92vw, 544px" />
        {candidate.pose.isPlaceholder && (
          <Badge className="absolute left-2 top-2 border-warn/50 bg-surface text-warn" title={t.vision.placeholderNote}>
            {t.vision.placeholderBadge}
          </Badge>
        )}

        {ready &&
          (['education', 'unity', 'leadership'] as const).map((key, i) => {
            const pillar = pillarBySlug.get(HOTSPOT_TO_PILLAR[key]);
            if (!pillar) return null;
            const theme = PILLAR_THEME[pillar.theme];
            const p = points[key];
            const chip =
              key === 'leadership' ? (
                <span className="block rounded-2xl p-[1.5px] shadow-[var(--shadow-float)]" style={{ background: theme.gradient }}>
                  <span className="flex min-w-52 flex-col items-center rounded-[calc(1rem-1px)] bg-surface px-5 py-3 text-center backdrop-blur">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-glow">{pillar.subtitle}</span>
                    <span className="mt-0.5 block font-display text-lg font-extrabold tracking-[0.2em]" style={{ color: theme.color }}>{pillar.name}</span>
                    <span className="mt-1 h-px w-10" style={{ background: theme.gradient }} />
                  </span>
                </span>
              ) : (
                <span className="glass flex flex-col items-center rounded-xl px-3 py-1.5 text-center" style={{ borderColor: `${theme.color}66` }}>
                  <span className="font-display text-sm font-bold tracking-[0.18em]" style={{ color: theme.color }}>{pillar.name}</span>
                  <span className="text-[11px] text-muted">{pillar.subtitle}</span>
                </span>
              );
            return (
              <HotspotMarker
                key={key}
                testId={`hotspot-${key}`}
                leftPct={p.leftPct}
                topPct={p.topPct}
                color={theme.color}
                glow={theme.glow}
                label={t.vision.hotspotLabel(pillar.name)}
                preview={pillar.tagline}
                icon={<Icon name={pillar.icon} className="size-5" />}
                chip={chip}
                chipSide={CHIP_SIDE[key]}
                compact={compact}
                number={i + 1}
                emphasis={key === 'leadership'}
                to={`${linkPrefix}/roadmap/${pillar.slug}`}
                onActivate={() => track({ type: 'hotspot_click', route: '/vision', pillar: pillar.slug, target: key })}
              />
            );
          })}

        {ready && (
          <HotspotMarker
            testId="hotspot-about"
            leftPct={points.about.leftPct}
            topPct={points.about.topPct}
            color={BRAND.glow}
            glow={BRAND.glowRgba}
            label={t.vision.aboutHotspotLabel}
            icon={<HelpCircle className="size-6" aria-hidden />}
            chip={<span className="glass rounded-lg px-2.5 py-1 font-display text-xs font-bold tracking-[0.18em] text-glow">{t.vision.aboutHotspot}</span>}
            chipSide="below"
            compact={compact}
            onActivate={() => {
              track({ type: 'about_open', route: '/vision', target: 'about' });
              onOpenAbout();
            }}
          />
        )}
      </div>
    </div>
  );
}
