import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { ErrorState, Spinner } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { PILLAR_THEME } from '../../lib/theme';
import type { IconName, PillarTheme } from '@reveal/shared';
import { useAdminPillars } from '../api';
import { PageHeader, StatusPill } from '../components/ui';
import { PublishStatus } from './OverviewPage';

export default function RoadmapsPage() {
  const q = useAdminPillars();
  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  return (
    <>
      <PageHeader title="Roadmap management" description="Each pillar has its own independently editable and publishable roadmap." />
      <ul className="grid gap-4 lg:grid-cols-3">
        {q.data.map((p) => {
          const theme = PILLAR_THEME[p.theme as PillarTheme];
          return (
            <li key={p.slug}>
              <Link to={`/admin/roadmaps/${p.slug}`} className="group flex h-full flex-col rounded-2xl border bg-surface p-5 transition hover:-translate-y-0.5" style={{ borderColor: `${theme.color}55` }} data-testid={`admin-roadmap-${p.slug}`}>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full" style={{ background: theme.soft, color: theme.color }}>
                    <Icon name={p.icon as IconName} className="size-5" />
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold tracking-[0.12em]" style={{ color: theme.color }}>{p.name}</p>
                    <p className="text-xs text-muted">/roadmap/{p.slug}</p>
                  </div>
                  <ArrowRight className="ml-auto size-5 text-muted transition group-hover:translate-x-1" aria-hidden />
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">{p.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PublishStatus state={p.state} />
                  <StatusPill tone="gray">{p.activeMilestoneCount}/{p.milestoneCount} milestones visible</StatusPill>
                  {p.exampleCount > 0 && <StatusPill tone="amber">{p.exampleCount} example placeholders</StatusPill>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
