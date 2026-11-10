import { useState } from 'react';
import { History, Send, UploadCloud, EyeOff, RotateCcw, Eye } from 'lucide-react';
import { hasPermission } from '@reveal/shared';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/primitives';
import { Dialog } from '../../components/ui/Dialog';
import { adminKeys, useAdminMutation, useMe, useVersions, type PublishState } from '../api';
import { Card, errorMessage, fmtDate, useToast } from './ui';
import { PublishStatus } from '../pages/OverviewPage';

interface PublishBarProps {
  state: PublishState;
  basePath: string; // e.g. /admin/pillars/midnimo or /admin/candidate
  previewHref?: string;
  canUnpublish?: boolean;
  invalidate: Array<readonly unknown[]>;
  /** Settings use settings:write instead of content permissions. */
  settings?: boolean;
}

/** Draft → (request review) → publish → unpublish controls with role-aware buttons. */
export function PublishBar({ state, basePath, previewHref, canUnpublish, invalidate, settings }: PublishBarProps) {
  const me = useMe();
  const toast = useToast();
  const role = me.data?.user.role;
  const canPublish = settings ? hasPermission(role, 'settings:write') : hasPermission(role, 'content:publish');
  const canRequest = !settings && hasPermission(role, 'content:request_publish') && !canPublish;
  const publish = useAdminMutation(() => api.post<{ version: number }>(`${basePath}/publish`, {}), [...invalidate]);
  const unpublish = useAdminMutation(() => api.post(`${basePath}/unpublish`, {}), [...invalidate]);
  const request = useAdminMutation(() => api.post(`${basePath}/request-review`, {}), [...invalidate]);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4" data-testid="publish-bar">
      <PublishStatus state={state} />
      <span className="text-xs text-muted">
        Draft saved {fmtDate(state.draftUpdatedAt)} · Published {fmtDate(state.publishedAt)}
      </span>
      <div className="ml-auto flex flex-wrap gap-2">
        {previewHref && (
          <a href={previewHref} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold hover:bg-white/5">
            <Eye className="size-4" aria-hidden /> Preview draft
          </a>
        )}
        {canRequest && (
          <Button size="sm" variant="secondary" loading={request.isPending} icon={<Send className="size-4" aria-hidden />}
            onClick={() => request.mutate(undefined, { onSuccess: () => toast('success', 'An owner has been asked to review and publish.'), onError: (e) => toast('error', errorMessage(e)) })}>
            Submit for publication
          </Button>
        )}
        {canPublish && canUnpublish && state.publishedVersion && (
          <Button size="sm" variant="ghost" loading={unpublish.isPending} icon={<EyeOff className="size-4" aria-hidden />}
            onClick={() => {
              if (window.confirm('Unpublish this roadmap? Visitors will no longer see it.')) unpublish.mutate(undefined, { onSuccess: () => toast('success', 'Unpublished.'), onError: (e) => toast('error', errorMessage(e)) });
            }}>
            Unpublish
          </Button>
        )}
        {canPublish && (
          <Button size="sm" loading={publish.isPending} icon={<UploadCloud className="size-4" aria-hidden />} data-testid="publish"
            onClick={() => publish.mutate(undefined, { onSuccess: (r) => toast('success', `Published version ${r.version}. The public site now shows this content.`), onError: (e) => toast('error', errorMessage(e)) })}>
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}

export function VersionHistory({ entityType, entityId, invalidate }: { entityType: 'candidate' | 'pillar' | 'settings'; entityId: string; invalidate: Array<readonly unknown[]> }) {
  const [open, setOpen] = useState(false);
  const versions = useVersions(entityType, entityId);
  const toast = useToast();
  const restore = useAdminMutation((id: string) => api.post(`/admin/versions/${id}/restore`, {}), [...invalidate, adminKeys.versions(entityType, entityId)]);
  return (
    <>
      <Button size="sm" variant="secondary" icon={<History className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
        Version history
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Version history" closeLabel="Close">
        <p className="mb-4 text-sm text-muted">Restoring copies a published version into the draft. Publish again to make it live.</p>
        {versions.data?.length === 0 && <p className="text-sm text-muted">Nothing has been published yet.</p>}
        <ul className="divide-y divide-line">
          {versions.data?.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">Version {v.version}</p>
                <p className="text-xs text-muted">{fmtDate(v.publishedAt)} · by {v.publishedBy}{v.note ? ` · ${v.note}` : ''}</p>
              </div>
              <Button size="sm" variant="secondary" icon={<RotateCcw className="size-4" aria-hidden />} loading={restore.isPending && restore.variables === v.id}
                onClick={() => {
                  if (window.confirm(`Replace the current draft with version ${v.version}?`))
                    restore.mutate(v.id, { onSuccess: () => { toast('success', `Version ${v.version} restored to draft.`); setOpen(false); }, onError: (e) => toast('error', errorMessage(e)) });
                }}>
                Restore
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}

export function SectionCard(props: Parameters<typeof Card>[0]) {
  return <Card {...props} />;
}
