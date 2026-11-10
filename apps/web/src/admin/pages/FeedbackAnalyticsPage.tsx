import { ErrorState, Spinner } from '../../components/ui/primitives';
import { useAnalytics } from '../api';
import { PageHeader } from '../components/ui';
import { FeedbackDistributionChart, FeedbackSummaryCards, PollDisclaimer, TrafficChart } from '../components/charts';
import { DateRangeFilter, useDateRange } from '../components/DateRangeFilter';

export default function FeedbackAnalyticsPage() {
  const { range, setRange, query } = useDateRange(90);
  const q = useAnalytics(query);
  return (
    <>
      <PageHeader title="Feedback analytics" description="Aggregate summaries of optional roadmap feedback." />
      <div className="mb-4"><PollDisclaimer /></div>
      <div className="mb-6"><DateRangeFilter range={range} onChange={setRange} /></div>
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : (
        <div className="space-y-6">
          <FeedbackSummaryCards feedback={q.data.feedback} range={q.data.range} />
          <FeedbackDistributionChart feedback={q.data.feedback} range={q.data.range} />
          <TrafficChart daily={q.data.daily} title="Daily activity (includes feedback count in table)" />
        </div>
      )}
    </>
  );
}
