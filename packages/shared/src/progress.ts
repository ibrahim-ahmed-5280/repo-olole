/** Fraction (0–1) of a roadmap read, given how many milestones have been reached. */
export function roadmapProgress(reachedCount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, reachedCount / total));
}

/** Human readable "3 / 7" style progress, clamped to valid bounds (1-based). */
export function progressLabel(activeIndex: number, total: number): { current: number; total: number } {
  if (total <= 0) return { current: 0, total: 0 };
  return { current: Math.min(total, Math.max(1, activeIndex + 1)), total };
}

/** Returns the index of the next/previous milestone, or null at the ends. */
export function stepIndex(activeIndex: number, total: number, direction: 1 | -1): number | null {
  const next = activeIndex + direction;
  if (next < 0 || next >= total) return null;
  return next;
}

/**
 * Chooses the "active" milestone from visibility ratios reported by IntersectionObserver.
 * Picks the most visible item; ties go to the earlier item. Returns fallback when nothing is visible.
 */
export function pickActiveIndex(ratios: number[], fallback: number): number {
  let best = -1;
  let bestRatio = 0;
  ratios.forEach((r, i) => {
    if (r > bestRatio) {
      bestRatio = r;
      best = i;
    }
  });
  return best === -1 ? fallback : best;
}

/** Sort helper for anything with a numeric `order`, stable on ties by `id`/`_id`. */
export function sortByOrder<T extends { order: number; id?: string; _id?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order || String(a.id ?? a._id ?? '').localeCompare(String(b.id ?? b._id ?? '')));
}

/** Applies a new id order and returns `{id, order}` pairs with contiguous order values starting at 1. */
export function normalizeOrder(currentIds: string[], requestedIds: string[]): Array<{ id: string; order: number }> {
  const current = new Set(currentIds);
  const requested = new Set(requestedIds);
  if (current.size !== requested.size || requestedIds.length !== requested.size) {
    throw new Error('Reorder list must contain each milestone exactly once');
  }
  for (const id of requestedIds) if (!current.has(id)) throw new Error('Unknown milestone in reorder list');
  return requestedIds.map((id, i) => ({ id, order: i + 1 }));
}
