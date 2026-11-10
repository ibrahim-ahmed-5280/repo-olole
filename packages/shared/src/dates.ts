/** All analytics dates are UTC calendar days in YYYY-MM-DD form. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDay(day: string): Date {
  const d = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid day: ${day}`);
  return d;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export interface ResolvedRange {
  from: string;
  to: string;
  /** Inclusive start as Date (00:00 UTC). */
  start: Date;
  /** Exclusive end as Date (00:00 UTC on the day after `to`). */
  endExclusive: Date;
  days: number;
}

/**
 * Resolves an optional {from, to} into a bounded, inclusive UTC range.
 * Defaults to the last `defaultDays` days ending today; caps the span at `maxDays`.
 */
export function resolveDateRange(
  input: { from?: string; to?: string },
  now: Date = new Date(),
  defaultDays = 30,
  maxDays = 366,
): ResolvedRange {
  const today = parseDay(dayKey(now));
  let end = input.to ? parseDay(input.to) : today;
  let start = input.from ? parseDay(input.from) : addDays(end, -(defaultDays - 1));
  if (start > end) [start, end] = [end, start];
  let days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days > maxDays) {
    start = addDays(end, -(maxDays - 1));
    days = maxDays;
  }
  return { from: dayKey(start), to: dayKey(end), start, endExclusive: addDays(end, 1), days };
}

/** Lists every day in a resolved range (used to fill gaps with zeros in charts). */
export function enumerateDays(range: { start: Date; days: number }): string[] {
  return Array.from({ length: range.days }, (_, i) => dayKey(addDays(range.start, i)));
}

/** ISO-8601 week label, e.g. "2026-W45". */
export function isoWeekKey(day: string): string {
  const d = parseDay(day);
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
  const thursday = addDays(d, 3 - dayNum);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function groupByWeek<T extends { date: string }>(
  rows: T[],
  sum: (acc: Record<string, number>, row: T) => void,
): Array<{ week: string } & Record<string, number | string>> {
  const map = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const key = isoWeekKey(row.date);
    const acc = map.get(key) ?? {};
    sum(acc, row);
    map.set(key, acc);
  }
  return [...map.entries()].map(([week, values]) => ({ week, ...values }));
}
