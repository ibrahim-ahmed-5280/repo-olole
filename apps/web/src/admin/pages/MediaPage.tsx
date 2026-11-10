import { useState } from 'react';
import { Trash2, Save } from 'lucide-react';
import type { MediaAssetDTO } from '@reveal/shared';
import { api } from '../../lib/api';
import { Button, ErrorState, Spinner } from '../../components/ui/primitives';
import { adminKeys, useAdminMutation, useMedia } from '../api';
import { Card, PageHeader, TextInput, errorMessage, fmtDate, useToast } from '../components/ui';
import { MediaUploader } from '../components/media';

function MediaItem({ m }: { m: MediaAssetDTO }) {
  const toast = useToast();
  const [alt, setAlt] = useState(m.altText);
  const save = useAdminMutation(() => api.patch(`/admin/media/${m.id}`, { altText: alt }), [adminKeys.media]);
  const del = useAdminMutation(() => api.del(`/admin/media/${m.id}`), [adminKeys.media]);
  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-surface">
      <img src={m.variants[0]?.url ?? m.url} alt={m.altText || ''} loading="lazy" className="aspect-[4/3] w-full bg-bg object-contain" />
      <div className="space-y-2 p-3">
        <p className="text-xs text-muted">{m.width}×{m.height} · {(m.bytes / 1024).toFixed(0)} KB · {m.variants.length} WebP sizes · {fmtDate(m.createdAt)}</p>
        <label className="block text-xs font-medium" htmlFor={`alt-${m.id}`}>Alt text</label>
        <div className="flex gap-2">
          <TextInput id={`alt-${m.id}`} value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} className="mt-0" />
          <Button size="sm" variant="secondary" aria-label="Save alt text" loading={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: () => toast('success', 'Alt text saved.'), onError: (e) => toast('error', errorMessage(e)) })}><Save className="size-4" aria-hidden /></Button>
          <Button size="sm" variant="ghost" aria-label="Delete image" loading={del.isPending} onClick={() => {
            if (window.confirm('Permanently delete this image? This cannot be undone.')) del.mutate(undefined, { onSuccess: () => toast('success', 'Image deleted.'), onError: (e) => toast('error', errorMessage(e)) });
          }}><Trash2 className="size-4" aria-hidden /></Button>
        </div>
        <a className="block truncate text-xs text-glow hover:underline" href={m.url} target="_blank" rel="noopener">{m.url}</a>
      </div>
    </li>
  );
}

export default function MediaPage() {
  const q = useMedia();
  return (
    <>
      <PageHeader title="Media library" description="Approved candidate photos and roadmap illustrations. Files are validated by signature (JPEG, PNG, WebP, AVIF), re-encoded and stripped of metadata." />
      <Card className="mb-6"><MediaUploader /></Card>
      {q.isPending ? <Spinner /> : q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{q.data.map((m) => <MediaItem key={m.id} m={m} />)}</ul>
      )}
    </>
  );
}
