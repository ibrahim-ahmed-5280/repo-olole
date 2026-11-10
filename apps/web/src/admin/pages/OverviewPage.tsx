import { Link } from 'react-router';
import { Spinner, ErrorState } from '../../components/ui/primitives';
import { useDashboard, type PublishState } from '../api';
import { Card, PageHeader, StatusPill, fmtDate } from '../components/ui';
import { PILLAR_NAME, PollDisclaimer, StatisticsCard, TrafficChart, FeedbackDistributionChart } from '../components/charts';

export function PublishStatus({ state }: { state: PublishState }) {
  if (!state.publishedVersion) return <StatusPill tone="gray">Not published</StatusPill>;
  if (state.reviewRequestedAt) return <StatusPill tone="blue">Review requested</StatusPill>;
  if (state.hasUnpublishedChanges) return <StatusPill tone="amber">Unpublished changes</StatusPill>;
  return <StatusPill tone="green">Published v{state.publishedVersion}</StatusPill>;
}

export default function OverviewPage() {
  const q = useDashboard();
  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  const d = q.data;
  return (
    <>
      <PageHeader title="Dashboard overview" description={`Signed in as ${d.role}. Sections shown depend on your role.`} />
      <div className="space-y-6">
        {d.analytics && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatisticsCard testId="kpi-pageviews" label="Page views (14 days)" value={d.analytics.totals.pageViews} />
              <StatisticsCard label="Sessions (approx.)" value={d.analytics.totals.sessions} hint="Not unique people" />
              <StatisticsCard label="Roadmap completions" value={d.analytics.totals.completions} />
              <StatisticsCard label="Feedback responses" value={d.analytics.totals.feedback} />
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <TrafficChart daily={d.analytics.daily} title="Traffic — last 14 days" />
              <FeedbackDistributionChart feedback={d.analytics.feedback} range={d.analytics.range} />
            </div>
            <PollDisclaimer />
          </>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          {d.content && (
            <Card title="Content status" actions={<Link className="text-sm text-glow hover:underline" to="/admin/roadmaps">Manage</Link>}>
              <ul className="divide-y divide-line">
                <li className="flex items-center justify-between gap-3 py-3">
                  <Link to="/admin/candidate" className="font-medium hover:underline">Candidate profile</Link>
                  <PublishStatus state={d.content.candidate} />
                </li>
                {d.content.pillars.map((p) => (
                  <li key={p.slug} className="flex items-center justify-between gap-3 py-3">
                    <Link to={`/admin/roadmaps/${p.slug}`} className="font-medium hover:underline">{p.name} roadmap</Link>
                    <PublishStatus state={p.state} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {d.feedback && (
            <Card title={`Recent feedback (${d.feedback.newCount} new of ${d.feedback.total})`} actions={<Link className="text-sm text-glow hover:underline" to="/admin/feedback">Open inbox</Link>}>
              {d.feedback.recent.length === 0 ? (
                <p className="text-sm text-muted">No feedback yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {d.feedback.recent.map((f) => (
                    <li key={f.id} className="py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <StatusPill tone={f.response === 'yes' ? 'green' : 'red'}>{f.response === 'yes' ? 'Yes' : 'No'}</StatusPill>
                        <span className="text-muted">{PILLAR_NAME[f.pillar]}</span>
                        <span className="ml-auto text-xs text-muted">{fmtDate(f.createdAt)}</span>
                      </div>
                      {f.suggestion && <p className="mt-1 line-clamp-2">{f.suggestion}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
