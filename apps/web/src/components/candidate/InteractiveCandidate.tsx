import { useMemo } from 'react';
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
import { PILLAR_THEME } from '../../lib/theme';
import { useElementSize } from '../../hooks/useElementSize';
import { CandidatePortrait } from '../intro/CandidatePortrait';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/primitives';
import { HotspotMarker, type ChipSide } from './HotspotMarker';

const SAFE_INSET = 24; // keeps 44px markers inside the frame
const COMPACT_BELOW = 400; // px of portrait width

const CHIP_SIDE: Record<Exclude<HotspotKey, 'about'>, ChipSide> = {
  // Candidate's anatomical right hand is on the viewer's left.
  education: 'left',
  unity: 'right',
  leadership: 'below',
};

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
  const image = candidate.pose.image ?? candidate.portrait;
  const natural = image ? { width: image.width, height: image.height } : { width: 4, height: 5 };

  const points = useMemo(() => {
    const entries = (Object.keys(candidate.pose.anchors) as HotspotKey[]).map((key) => [
      key,
      mapAnchor(candidate.pose.anchors[key], natural, size, 'contain', { x: 0.5, y: 0.5 }, SAFE_INSET),
    ] as const);
    return Object.fromEntries(entries) as Record<HotspotKey, ReturnType<typeof mapAnchor>>;
  }, [candidate.pose.anchors, natural.width, natural.height, size]); // eslint-disable-line react-hooks/exhaustive-deps

  const compact = size.width > 0 && (size.width < COMPACT_BELOW || markersOverlap(Object.values(points), 48));
  const pillarBySlug = new Map(pillars.map((p) => [p.slug, p]));
  const ready = size.width > 0;

  return (
    <div className="relative mx-auto w-full max-w-[34rem]" style={{ maxWidth: `min(34rem, calc(74dvh * ${natural.width / natural.height}))` }}>
      <div ref={ref} className="relative w-full" style={{ aspectRatio: `${natural.width} / ${natural.height}` }}>
        <CandidatePortrait image={image} alt={`${t.intro.portraitAlt}: ${candidate.name}`} priority masked="bottom" sizes="(max-width: 640px) 92vw, 544px" />
        {candidate.pose.isPlaceholder && (
          <Badge className="absolute left-2 top-2 border-lead/50 bg-bg/80 text-lead" title={t.vision.placeholderNote}>
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
                <span className="glass flex min-w-52 items-center gap-3 rounded-2xl border-lead/50 px-4 py-3 shadow-[0_10px_40px_-10px_rgba(230,184,90,0.5)]">
                  <span className="text-left">
                    <span className="block font-display text-base font-bold tracking-[0.18em]" style={{ color: theme.color }}>{pillar.name}</span>
                    <span className="block text-xs text-muted">{pillar.subtitle}</span>
                  </span>
                </span>
              ) : (
                <span className="glass flex flex-col rounded-xl px-3 py-2 text-left">
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
            color="#4EC8FF"
            glow="rgba(78,200,255,0.45)"
            label={t.vision.aboutHotspotLabel}
            icon={<HelpCircle className="size-6" aria-hidden />}
            chip={<span className="glass rounded-xl px-3 py-2 font-display text-sm font-bold tracking-[0.18em] text-glow">{t.vision.aboutHotspot}</span>}
            chipSide="right"
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
