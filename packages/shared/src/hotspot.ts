import type { Anchor } from './schemas';

export interface Size {
  width: number;
  height: number;
}

export type ObjectFit = 'contain' | 'cover' | 'fill';

export interface RenderedImageBox {
  /** Rendered image width/height in container pixels (may exceed container for `cover`). */
  width: number;
  height: number;
  /** Offset of the rendered image's top-left from the container's top-left. */
  offsetX: number;
  offsetY: number;
}

/**
 * Computes where an image is drawn inside a container, mirroring CSS `object-fit`
 * and `object-position` (given as 0–1 fractions, e.g. {x: .5, y: .2} = "50% 20%").
 */
export function computeRenderedBox(
  natural: Size,
  container: Size,
  fit: ObjectFit = 'contain',
  position: Anchor = { x: 0.5, y: 0.5 },
): RenderedImageBox {
  if (natural.width <= 0 || natural.height <= 0 || container.width <= 0 || container.height <= 0) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }
  if (fit === 'fill') {
    return { width: container.width, height: container.height, offsetX: 0, offsetY: 0 };
  }
  const scaleX = container.width / natural.width;
  const scaleY = container.height / natural.height;
  const scale = fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const width = natural.width * scale;
  const height = natural.height * scale;
  // CSS object-position percentages align the same fraction of the image with the same fraction of the container.
  const offsetX = (container.width - width) * position.x + 0; // + 0 normalises -0
  const offsetY = (container.height - height) * position.y + 0;
  return { width, height, offsetX, offsetY };
}

export interface MappedAnchor {
  /** Pixel position inside the container. */
  x: number;
  y: number;
  /** Position as a percentage of the container (for CSS left/top). */
  leftPct: number;
  topPct: number;
  /** False when the anchor is cropped out of view (e.g. object-fit: cover on a narrow phone). */
  visible: boolean;
}

/**
 * Maps a normalized image anchor (0–1, relative to the *image*) into container coordinates.
 * Used to keep hotspots glued to anatomical features at every screen size.
 */
export function mapAnchor(
  anchor: Anchor,
  natural: Size,
  container: Size,
  fit: ObjectFit = 'contain',
  position: Anchor = { x: 0.5, y: 0.5 },
  /** Keep markers this many px away from the container edges. */
  safeInset = 0,
): MappedAnchor {
  const box = computeRenderedBox(natural, container, fit, position);
  const rawX = box.offsetX + anchor.x * box.width;
  const rawY = box.offsetY + anchor.y * box.height;
  const visible = rawX >= 0 && rawX <= container.width && rawY >= 0 && rawY <= container.height;
  const x = clamp(rawX, safeInset, container.width - safeInset);
  const y = clamp(rawY, safeInset, container.height - safeInset);
  return {
    x,
    y,
    leftPct: container.width ? (x / container.width) * 100 : 0,
    topPct: container.height ? (y / container.height) * 100 : 0,
    visible,
  };
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

/** Converts a click inside the rendered image back into a normalized anchor (used by the admin anchor editor). */
export function pointToAnchor(point: { x: number; y: number }, box: RenderedImageBox): Anchor {
  if (box.width === 0 || box.height === 0) return { x: 0.5, y: 0.5 };
  return {
    x: round4(clamp((point.x - box.offsetX) / box.width, 0, 1)),
    y: round4(clamp((point.y - box.offsetY) / box.height, 0, 1)),
  };
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** Two markers closer than `minDistance` px overlap; used to switch to the compact layout on phones. */
export function markersOverlap(points: Array<{ x: number; y: number }>, minDistance: number): boolean {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i]!;
      const b = points[j]!;
      if (Math.hypot(a.x - b.x, a.y - b.y) < minDistance) return true;
    }
  }
  return false;
}
