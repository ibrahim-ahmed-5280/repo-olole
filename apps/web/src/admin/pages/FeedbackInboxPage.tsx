import { useState } from 'react';
import { Download, Eye, EyeOff, Check, StickyNote } from 'lucide-react';
import { PILLAR_SLUGS, hasPermission, type FeedbackDTO } from '@reveal/shared';
import { api, API_BASE } from '../../lib/api';
import { Button, ErrorState, Spinner } from '../../components/ui/primitives';
import { Dialog } from '../../components/ui/Dialog';
import { useAdminMutation, useFeedback, useMe } from '../api';
import { Card, Field, PageHeader, Select, StatusPill, TextArea, TextInput, errorMessage, fmtDate, useToast } from '../components/ui';
import { PILLAR_NAME, PollDisclaimer } from '../components/charts';

interface Filters {
  pillar: string;
  response: string;
  status: string;
  q: string;
  from: string;
  to: string;
  page: number;
}

function FeedbackTable({ items, canModerate, onModerate, onNote }: { items: FeedbackDTO[]; canModerate: boolean; onModerate: (id: string, status: FeedbackDTO['moderationStatus']) => void; onNote: (f: FeedbackDTO) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <caption className="sr-only">Feedback submissions</caption>
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th scope="col" className="py-2 pr-3">Submitted</th>
            <th scope="col" className="pr-3">Roadmap</th>
            <th scope="col" className="pr-3">Useful?</th>
            <th scope="col" className="pr-3">Suggestion</th>
            <th scope="col" className="pr-3">Status</th>
            {canModerate && <th scope="col"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id} className="border-t border-line align-top" data-testid="feedback-row">
              <td className="whitespace-nowrap py-3 pr-3 text-muted">{fmtDate(f.createdAt)}</td>
              <td className="pr-3 py-3">{PILLAR_NAME[f.pillar]}</td>
              <td className="pr-3 py-3"><StatusPill tone={f.response === 'yes' ? 'green' : 'red'}>{f.response === 'yes' ? 'Yes' : 'No'}</StatusPill></td>
              <td className="max-w-md py-3 pr-3">
                {f.suggestion ? <p className={f.moderationStatus === 'hidden' ? 'text-muted line-through' : 'whitespace-pre-line'}>{f.suggestion}</p> : <span className="text-muted">—</span>}
                {f.reviewNote && <p className="mt-1 text-xs text-glow">Note: {f.reviewNote}</p>}
              </td>
              <td className="pr-3 py-3">
                <StatusPill tone={f.moderationStatus === 'new' ? 'blue' : f.moderationStatus === 'hidden' ? 'gray' : 'green'}>{f.moderationStatus}</StatusPill>
              </td>
              {canModerate && (
                <td className="py-2">
                  <div className="flex gap-1">
                    {f.moderationStatus !== 'reviewed' && <Button size="sm" variant="ghost" aria-label="Mark reviewed" onClick={() => onModerate(f.id, 'reviewed')}><Check className="size-4" aria-hidden /></Button>}
                    {f.moderationStatus !== 'hidden' ? (
                      <Button size="sm" variant="ghost" aria-label="Hide" onClick={() => onModerate(f.id, 'hidden')}><EyeOff className="size-4" aria-hidden /></Button>
                    ) : (
                      <Button size="sm" variant="ghost" aria-label="Unhide" onClick={() => onModerate(f.id, 'reviewed')}><Eye className="size-4" aria-hidden /></Button>
                    )}
                    <Button size="sm" variant="ghost" aria-label="Add review note" onClick={() => onNote(f)}><StickyNote className="size-4" aria-hidden /></Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FeedbackInboxPage() {
  const me = useMe();
  const toast = useToast();
  const [f, setF] = useState<Filters>({ pillar: '', response: '', status: '', q: '', from: '', to: '', page: 1 });
  const [noteFor, setNoteFor] = useState<FeedbackDTO | null>(null);
  const [note, setNote] = useState('');
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => [k, String(v)]));
  const query = params.toString();
  const q = useFeedback(query);
  const role = me.data?.user.role;
  const moderate = useAdminMutation(({ id, body }: { id: string; body: object }) => api.patch(`/admin/feedback/${id}`, body), [['admin', 'feedback']]);
  const set = (k: keyof Filters, v: string) => setF((x) => ({ ...x, [k]: v, page: 1 }));
  const total = q.data?.meta?.total ?? 0;
  const pageSize = q.data?.meta?.pageSize ?? 20;
  const exportParams = new URLSearchParams(params);
  exportParams.delete('page');

  return (
    <>
      <PageHeader
        title="Feedback inbox"
        description="Anonymous roadmap feedback. No names, student IDs, IPs or device data are stored."
        actions={hasPermission(role, 'feedback:export') && (
          <a href={`${API_BASE}/admin/feedback/export.csv?${exportParams}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:bg-ink/5">
            <Download className="size-4" aria-hidden /> Export CSV
          </a>
        )}
      />
      <div className="mb-4"><PollDisclaimer /></div>
      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Filter feedback">
          <Field label="Search suggestions" className="lg:col-span-2">{(id) => <TextInput id={id} type="search" value={f.q} onChange={(e) => set('q', e.target.value)} />}</Field>
          <Field label="Roadmap">{(id) => <Select id={id} value={f.pillar} onChange={(e) => set('pillar', e.target.value)}><option value="">All</option>{PILLAR_SLUGS.map((s) => <option key={s} value={s}>{PILLAR_NAME[s]}</option>)}</Select>}</Field>
          <Field label="Answer">{(id) => <Select id={id} value={f.response} onChange={(e) => set('response', e.target.value)}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></Select>}</Field>
          <Field label="Status">{(id) => <Select id={id} value={f.status} onChange={(e) => set('status', e.target.value)}><option value="">All</option><option value="new">New</option><option value="reviewed">Reviewed</option><option value="hidden">Hidden</option></Select>}</Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">{(id) => <TextInput id={id} type="date" value={f.from} onChange={(e) => set('from', e.target.value)} />}</Field>
            <Field label="To">{(id) => <TextInput id={id} type="date" value={f.to} onChange={(e) => set('to', e.target.value)} />}</Field>
          </div>
        </div>
      </Card>
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : (
        <Card title={`${total} result${total === 1 ? '' : 's'}`}>
          {q.data.data.length === 0 ? <p className="text-sm text-muted">No feedback matches these filters.</p> : (
            <FeedbackTable
              items={q.data.data}
              canModerate={hasPermission(role, 'feedback:moderate')}
              onModerate={(id, status) => moderate.mutate({ id, body: { moderationStatus: status } }, { onError: (e) => toast('error', errorMessage(e)) })}
              onNote={(fb) => { setNoteFor(fb); setNote(fb.reviewNote ?? ''); }}
            />
          )}
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <Button size="sm" variant="secondary" disabled={f.page <= 1} onClick={() => setF((x) => ({ ...x, page: x.page - 1 }))}>Previous</Button>
            <span className="text-muted">Page {f.page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
            <Button size="sm" variant="secondary" disabled={f.page * pageSize >= total} onClick={() => setF((x) => ({ ...x, page: x.page + 1 }))}>Next</Button>
          </div>
        </Card>
      )}
      <Dialog open={!!noteFor} onClose={() => setNoteFor(null)} title="Review note" closeLabel="Close" side="center">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!noteFor) return;
          moderate.mutate({ id: noteFor.id, body: { reviewNote: note } }, { onSuccess: () => { toast('success', 'Note saved.'); setNoteFor(null); }, onError: (err) => toast('error', errorMessage(err)) });
        }}>
          <Field label="Internal note (never shown publicly)">{(id) => <TextArea id={id} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />}</Field>
          <div className="mt-4 flex justify-end"><Button type="submit" loading={moderate.isPending}>Save note</Button></div>
        </form>
      </Dialog>
    </>
  );
}
