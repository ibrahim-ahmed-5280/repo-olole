import { ErrorState, Spinner } from '../../components/ui/primitives';
import { useAnalytics } from '../api';
import { Card, PageHeader } from '../components/ui';
import { CompletionRateChart, PILLAR_NAME, RoadmapPopularityChart, StatisticsCard, TrafficChart } from '../components/charts';
import { DateRangeFilter, useDateRange } from '../components/DateRangeFilter';

export default function AnalyticsPage() {
  const { range, setRange, query } = useDateRange(30);
  const q = useAnalytics(query);
  return (
    <>
      <PageHeader title="Website analytics" description="Privacy-respecting aggregate statistics. No cookies, fingerprints or individual profiles are used." />
      <div className="mb-6"><DateRangeFilter range={range} onChange={setRange} /></div>
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : (
        <div className="space-y-6" aria-busy={q.isFetching}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatisticsCard testId="analytics-pageviews" label="Page views" value={q.data.totals.pageViews} />
            <StatisticsCard label="Sessions (approx.)" value={q.data.totals.sessions} hint="Per browser tab, not people" />
            <StatisticsCard label="Roadmap views" value={q.data.totals.roadmapViews} />
            <StatisticsCard label="Completions" value={q.data.totals.completions} />
            <StatisticsCard label="Feedback" value={q.data.totals.feedback} />
          </div>
          <TrafficChart daily={q.data.daily} title={`Daily traffic (${q.data.range.from} → ${q.data.range.to})`} />
          <div className="grid gap-6 xl:grid-cols-2">
            <RoadmapPopularityChart roadmaps={q.data.roadmaps} />
            <CompletionRateChart roadmaps={q.data.roadmaps} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Weekly trend">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted"><tr><th scope="col" className="py-2">ISO week</th><th scope="col">Page views</th><th scope="col">Sessions</th></tr></thead>
                <tbody>
                  {q.data.weekly.map((w) => (
                    <tr key={w.week} className="border-t border-line"><th scope="row" className="py-2 font-medium">{w.week}</th><td className="tabular-nums">{w.pageViews}</td><td className="tabular-nums">{w.sessions}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Most-read milestones">
              {q.data.topMilestones.length === 0 ? (
                <p className="text-sm text-muted">No milestone views in this period.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {q.data.topMilestones.map((m, i) => (
                    <li key={m.milestoneId} className="flex items-center gap-3">
                      <span className="w-6 text-muted tabular-nums">{i + 1}.</span>
                      <span className="flex-1">{m.title} <span className="text-muted">· {m.pillar ? PILLAR_NAME[m.pillar] : '—'}</span></span>
                      <span className="tabular-nums">{m.views}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
          <Card title="Engagement events">
            <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {q.data.events.map((e) => (
                <li key={e.type} className="flex justify-between rounded-lg bg-elevated px-3 py-2"><code className="text-muted">{e.type}</code><span className="tabular-nums">{e.count}</span></li>
              ))}
            </ul>
          </Card>
          <Card title="Methodology">
            <p className="text-sm leading-relaxed text-muted">{q.data.methodology}</p>
          </Card>
        </div>
      )}
    </>
  );
}
