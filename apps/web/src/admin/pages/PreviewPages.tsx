import { Link, useParams } from 'react-router';
import { isPillarSlug, type PillarDTO } from '@reveal/shared';
import { ErrorState, Spinner } from '../../components/ui/primitives';
import { RoadmapView } from '../../components/roadmap/RoadmapView';
import { VisionView } from '../../pages/VisionPage';
import { useAdminPillars, usePreviewCandidate, usePreviewRoadmap } from '../api';

function PreviewBanner() {
  return (
    <div role="note" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-warn px-4 py-1.5 text-center text-xs font-semibold text-white">
      DRAFT PREVIEW — not visible to the public until published.
      <Link to="/admin" className="underline">Back to admin</Link>
    </div>
  );
}

function usePreviewPillars(): PillarDTO[] {
  const q = useAdminPillars();
  return (q.data ?? []).map((p) => ({
    slug: p.slug, name: p.name, subtitle: p.subtitle, tagline: p.tagline, description: p.description, conclusion: p.conclusion,
    icon: p.icon as PillarDTO['icon'], theme: p.theme as PillarDTO['theme'], order: p.order, milestoneCount: p.activeMilestoneCount,
  }));
}

export function PreviewVisionPage() {
  const c = usePreviewCandidate();
  const pillars = usePreviewPillars();
  if (c.isPending) return <Spinner />;
  if (c.isError) return <ErrorState />;
  return (
    <>
      <PreviewBanner />
      <VisionView candidate={c.data} pillars={pillars} linkPrefix="/admin/preview" showReplay={false} />
    </>
  );
}

export function PreviewRoadmapPage() {
  const { slug } = useParams();
  const valid = isPillarSlug(slug) ? slug : 'waxbarasho';
  const r = usePreviewRoadmap(valid);
  const pillars = usePreviewPillars();
  if (!isPillarSlug(slug)) return <ErrorState title="Unknown roadmap" />;
  if (r.isPending) return <Spinner />;
  if (r.isError) return <ErrorState />;
  return (
    <>
      <PreviewBanner />
      <RoadmapView key={slug} roadmap={r.data} pillars={pillars} preview linkPrefix="/admin/preview" />
    </>
  );
}
