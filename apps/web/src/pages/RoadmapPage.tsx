import { useParams } from 'react-router';
import { isPillarSlug } from '@reveal/shared';
import { useT } from '../i18n';
import { ApiRequestError } from '../lib/api';
import { usePillars, useRoadmap } from '../services/public';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { SiteFooter, SiteHeader } from '../components/layout/PublicLayout';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import { ErrorState, Spinner } from '../components/ui/primitives';
import NotFoundPage from './NotFoundPage';

function RoadmapLoader({ slug }: { slug: Parameters<typeof useRoadmap>[0] }) {
  const t = useT();
  const roadmap = useRoadmap(slug);
  const pillars = usePillars();
  useDocumentMeta(roadmap.data ? `${roadmap.data.name} — ${roadmap.data.tagline}` : undefined, roadmap.data?.description);

  if (roadmap.isPending) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;
  if (roadmap.isError) {
    const notPublished = roadmap.error instanceof ApiRequestError && roadmap.error.status === 404;
    return (
      <div className="grid min-h-dvh place-items-center">
        <ErrorState message={notPublished ? t.notPublished : undefined} onRetry={notPublished ? undefined : () => void roadmap.refetch()} />
      </div>
    );
  }
  return <RoadmapView key={slug} roadmap={roadmap.data} pillars={pillars.data ?? []} />;
}

export default function RoadmapPage() {
  const { slug } = useParams();
  if (!isPillarSlug(slug)) return <NotFoundPage />;
  return (
    <>
      <SiteHeader />
      <RoadmapLoader slug={slug} />
      <SiteFooter />
    </>
  );
}
