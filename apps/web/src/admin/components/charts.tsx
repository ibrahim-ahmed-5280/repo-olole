import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PILLAR_THEME, TOKENS } from '../../lib/theme';
import type { AnalyticsSummaryDTO, PillarSlug } from '@reveal/shared';
import { Card } from './ui';

const AXIS = { stroke: TOKENS.muted, fontSize: 12 };
const GRID = TOKENS.line;
const TOOLTIP = { contentStyle: { background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 12, color: TOKENS.ink, boxShadow: '0 8px 24px -12px rgba(22,43,37,0.2)' }, labelStyle: { color: TOKENS.muted } };
const PILLAR_COLOR: Record<PillarSlug, string> = { waxbarasho: PILLAR_THEME.education.color, midnimo: PILLAR_THEME.unity.color, hoggaan: PILLAR_THEME.leadership.color };
export const PILLAR_NAME: Record<PillarSlug, string> = { waxbarasho: 'Waxbarasho', midnimo: 'Midnimo', hoggaan: 'Hoggaan' };

export function StatisticsCard({ label, value, hint, testId }: { label: string; value: ReactNode; hint?: ReactNode; testId?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4" data-testid={testId}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Every chart ships with an equivalent data table for screen readers and keyboard users. */
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="min-h-11 cursor-pointer content-center text-muted hover:text-ink">View data as table</summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-line">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-elevated text-xs uppercase text-muted">
            <tr>{head.map((h) => <th key={h} scope="col" className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="px-3 py-2 font-medium">{c}</th> : <td key={j} className="px-3 py-2 tabular-nums">{c}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function TrafficChart({ daily, title = 'Traffic' }: { daily: AnalyticsSummaryDTO['daily']; title?: string }) {
  return (
    <Card title={title}>
      <div className="h-64" role="img" aria-label={`${title}: daily page views and sessions line chart. Table available below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={AXIS} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
            <YAxis tick={AXIS} allowDecimals={false} />
            <Tooltip {...TOOLTIP} />
            <Legend />
            <Line type="monotone" dataKey="pageViews" name="Page views" stroke={TOKENS.secondary} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sessions" name="Sessions" stroke={TOKENS.brandGreen} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption={title} head={['Date', 'Page views', 'Sessions', 'Feedback']} rows={daily.map((d) => [d.date, d.pageViews, d.sessions, d.feedback])} />
    </Card>
  );
}

export function RoadmapPopularityChart({ roadmaps }: { roadmaps: AnalyticsSummaryDTO['roadmaps'] }) {
  const data = roadmaps.map((r) => ({ ...r, name: PILLAR_NAME[r.pillar] }));
  return (
    <Card title="Roadmap popularity">
      <div className="h-64" role="img" aria-label="Roadmap views and completions bar chart. Table available below.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={AXIS} />
            <YAxis tick={AXIS} allowDecimals={false} />
            <Tooltip {...TOOLTIP} cursor={{ fill: 'rgba(22,43,37,0.04)' }} />
            <Legend />
            <Bar dataKey="views" name="Views (sessions)" fill={TOKENS.brandBlue} radius={[6, 6, 0, 0]} />
            <Bar dataKey="completions" name="Completions" fill={TOKENS.brandGreen} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        caption="Roadmap popularity"
        head={['Roadmap', 'Views', 'Completions', 'Completion rate', 'Hotspot clicks']}
        rows={data.map((r) => [r.name, r.views, r.completions, r.completionRate === null ? '—' : `${r.completionRate}%`, r.hotspotClicks])}
      />
    </Card>
  );
}

export function CompletionRateChart({ roadmaps }: { roadmaps: AnalyticsSummaryDTO['roadmaps'] }) {
  const data = roadmaps.map((r) => ({ name: PILLAR_NAME[r.pillar], rate: r.completionRate ?? 0, pillar: r.pillar, views: r.views }));
  return (
    <Card title="Completion rate">
      <div className="h-56" role="img" aria-label="Completion rate by roadmap. Table available below.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={AXIS} unit="%" />
            <YAxis type="category" dataKey="name" tick={AXIS} width={90} />
            <Tooltip {...TOOLTIP} formatter={(v) => `${v}%`} cursor={{ fill: 'rgba(22,43,37,0.04)' }} />
            <Bar dataKey="rate" name="Completion rate" radius={[0, 6, 6, 0]} fill={TOKENS.teal} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption="Completion rate" head={['Roadmap', 'Completion rate', 'Base (views)']} rows={data.map((d) => [d.name, `${d.rate}%`, d.views])} />
    </Card>
  );
}

export function FeedbackDistributionChart({ feedback, range }: { feedback: AnalyticsSummaryDTO['feedback']; range: { from: string; to: string } }) {
  const data = feedback.map((f) => ({ ...f, name: PILLAR_NAME[f.pillar] }));
  return (
    <Card title="Yes / No feedback by roadmap">
      <p className="mb-3 text-xs text-muted">Responses submitted {range.from} → {range.to}. Feedback from participating visitors only — not a representative election poll.</p>
      <div className="h-64" role="img" aria-label="Stacked bar chart of Yes and No responses per roadmap. Table available below.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={AXIS} />
            <YAxis tick={AXIS} allowDecimals={false} />
            <Tooltip {...TOOLTIP} cursor={{ fill: 'rgba(22,43,37,0.04)' }} />
            <Legend />
            <Bar dataKey="yes" name="Yes" stackId="a" fill={TOKENS.success} />
            <Bar dataKey="no" name="No" stackId="a" fill={TOKENS.danger} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        caption="Feedback by roadmap"
        head={['Roadmap', 'Responses', 'Yes', 'No', '% Yes among respondents']}
        rows={data.map((f) => [f.name, f.total, f.yes, f.no, f.positivePct === null ? '—' : `${f.positivePct}%`])}
      />
    </Card>
  );
}

export function FeedbackSummaryCards({ feedback, range }: { feedback: AnalyticsSummaryDTO['feedback']; range: { from: string; to: string } }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {feedback.map((f) => (
        <div key={f.pillar} className="rounded-2xl border bg-surface p-5" style={{ borderColor: `${PILLAR_COLOR[f.pillar]}66` }} data-testid={`feedback-summary-${f.pillar}`}>
          <p className="font-display text-sm font-bold tracking-[0.15em]" style={{ color: PILLAR_COLOR[f.pillar] }}>{PILLAR_NAME[f.pillar].toUpperCase()}</p>
          <p className="mt-3 text-3xl font-bold tabular-nums">{f.positivePct === null ? '—' : `${f.positivePct}%`}</p>
          <p className="text-xs text-muted">answered “Yes” among {f.total} respondent{f.total === 1 ? '' : 's'}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div><dt className="text-xs text-muted">Responses</dt><dd className="font-semibold tabular-nums">{f.total}</dd></div>
            <div><dt className="text-xs text-muted">Yes</dt><dd className="font-semibold tabular-nums text-success">{f.yes}</dd></div>
            <div><dt className="text-xs text-muted">No</dt><dd className="font-semibold tabular-nums text-danger">{f.no}</dd></div>
          </dl>
          <p className="mt-3 text-[11px] text-muted">Period: {range.from} → {range.to}</p>
        </div>
      ))}
    </div>
  );
}

export function PollDisclaimer() {
  return (
    <p role="note" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
      This data represents feedback from participating website visitors and is not a representative election poll. It must not be used to predict election results or to profile individuals.
    </p>
  );
}
