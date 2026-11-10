export interface FeedbackSummary {
  total: number;
  yes: number;
  no: number;
  /** Percentage of respondents answering "yes" (0–100, one decimal) or null when there are no responses. */
  positivePct: number | null;
}

export function summarizeFeedback(yes: number, no: number): FeedbackSummary {
  const total = yes + no;
  return {
    total,
    yes,
    no,
    positivePct: total === 0 ? null : Math.round((yes / total) * 1000) / 10,
  };
}

/**
 * Completion rate = sessions that reached the end of a roadmap / sessions that opened it.
 * Both numerators are de-duplicated per session server-side. Capped at 100%.
 */
export function completionRate(views: number, completions: number): number | null {
  if (views <= 0) return null;
  return Math.round(Math.min(1, completions / views) * 1000) / 10;
}

/** Safely formats a CSV cell: quotes, escapes, and neutralises spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n');
}
