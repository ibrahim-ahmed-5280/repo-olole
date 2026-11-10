import { useLayoutEffect, useState, type RefObject } from 'react';
import { motion, useScroll, useSpring, type MotionValue } from 'motion/react';
import type { PillarTheme } from '@reveal/shared';
import { useReducedMotionPref } from '../../lib/motion';

export interface PathPoint {
  x: number;
  y: number;
}

/** Builds a smooth winding road through the given points, bulging alternately left and right. */
export function buildWindingPath(points: PathPoint[], sway: number, start: PathPoint, end: PathPoint, phase = 1): string {
  const all = [start, ...points, end];
  if (all.length < 2) return '';
  let d = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`;
  for (let i = 1; i < all.length; i++) {
    const a = all[i - 1]!;
    const b = all[i]!;
    const dy = b.y - a.y;
    const dir = (i % 2 === 0 ? 1 : -1) * phase;
    const c1 = { x: a.x + sway * dir, y: a.y + dy * 0.45 };
    const c2 = { x: b.x + sway * dir, y: b.y - dy * 0.45 };
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

interface Geometry {
  width: number;
  height: number;
  nodes: PathPoint[];
}

/** Measures node centres (elements with [data-node]) relative to the container. */
function useNodeGeometry(containerRef: RefObject<HTMLElement | null>, deps: unknown[]): Geometry {
  const [geo, setGeo] = useState<Geometry>({ width: 0, height: 0, nodes: [] });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measured synchronously: ResizeObserver already batches callbacks once per frame,
    // and rAF would stall in background tabs.
    const measure = () => {
      const box = el.getBoundingClientRect();
      const nodes = [...el.querySelectorAll<HTMLElement>('[data-node]')].map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
      });
      setGeo((g) =>
        g.width === box.width && g.height === box.height && g.nodes.length === nodes.length && g.nodes.every((p, i) => p.x === nodes[i]!.x && p.y === nodes[i]!.y)
          ? g
          : { width: box.width, height: box.height, nodes },
      );
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return geo;
}

interface Props {
  containerRef: RefObject<HTMLElement | null>;
  variant: PillarTheme;
  color: string;
  milestoneCount: number;
}

/**
 * The "Living Path": a winding SVG road behind the milestones that lights up as the visitor scrolls.
 * One Motion scroll listener drives `pathLength`; no layout reads happen on scroll.
 */
export function RoadmapPath({ containerRef, variant, color, milestoneCount }: Props) {
  const reduced = useReducedMotionPref();
  const geo = useNodeGeometry(containerRef, [milestoneCount]);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start 70%', 'end 70%'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const progress: MotionValue<number> = reduced ? scrollYProgress : smooth;

  if (geo.width === 0 || geo.nodes.length === 0) return null;
  const isWide = geo.width >= 768;
  const sway = isWide ? 70 : 16;
  const first = geo.nodes[0]!;
  const last = geo.nodes[geo.nodes.length - 1]!;
  const start = { x: first.x, y: 0 };
  const end = { x: last.x, y: geo.height };
  const main = buildWindingPath(geo.nodes, sway, start, end, 1);
  const twin = variant === 'unity' ? buildWindingPath(geo.nodes, sway, start, end, -1) : null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-visible"
      width={geo.width}
      height={geo.height}
      viewBox={`0 0 ${geo.width} ${geo.height}`}
    >
      <defs>
        <filter id={`glow-${variant}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Base road */}
      {variant === 'leadership' && <path d={main} fill="none" stroke="#172840" strokeWidth={isWide ? 22 : 14} strokeLinecap="round" />}
      <path
        d={main}
        fill="none"
        stroke="#29415C"
        strokeWidth={variant === 'leadership' ? 2 : 3}
        strokeLinecap="round"
        strokeDasharray={variant === 'education' ? '2 12' : variant === 'leadership' ? '10 10' : undefined}
      />
      {twin && <path d={twin} fill="none" stroke="#29415C" strokeWidth={2} strokeLinecap="round" />}

      {/* Illuminated progress */}
      <motion.path d={main} fill="none" stroke={color} strokeWidth={variant === 'leadership' ? 3 : 4} strokeLinecap="round" filter={`url(#glow-${variant})`} style={{ pathLength: progress }} />
      {twin && <motion.path d={twin} fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={2.5} strokeLinecap="round" style={{ pathLength: progress }} />}

      {/* Unity: rings linking the two strands at each milestone */}
      {variant === 'unity' && geo.nodes.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r={isWide ? 30 : 24} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={1.5} />)}

      {/* Leadership: compass ticks around each milestone */}
      {variant === 'leadership' &&
        geo.nodes.map((n, i) => (
          <g key={i} transform={`translate(${n.x} ${n.y})`} stroke={color} strokeOpacity={0.35} strokeWidth={1.5}>
            <line x1="0" y1="-34" x2="0" y2="-28" />
            <line x1="0" y1="28" x2="0" y2="34" />
            <line x1="-34" y1="0" x2="-28" y2="0" />
            <line x1="28" y1="0" x2="34" y2="0" />
          </g>
        ))}
    </svg>
  );
}
