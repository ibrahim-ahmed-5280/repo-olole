import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { ICON_NAMES, PILLAR_THEMES, hasPermission, isPillarSlug, type IconName, type PillarSlug } from '@reveal/shared';
import { api } from '../../lib/api';
import { Button, ErrorState, Spinner } from '../../components/ui/primitives';
import { Dialog } from '../../components/ui/Dialog';
import { Icon } from '../../components/ui/Icon';
import { adminKeys, useAdminMutation, useMe, usePillarDraft, type MilestoneDraft, type PillarDraft } from '../api';
import { Card, Field, PageHeader, Select, StatusPill, TextArea, TextInput, Toggle, errorMessage, useToast } from '../components/ui';
import { PublishBar, VersionHistory } from '../components/publishing';
import { MediaPicker } from '../components/media';

type MilestoneForm = Omit<MilestoneDraft, 'id' | 'order'> & { id?: string };

const EMPTY_MILESTONE: MilestoneForm = {
  title: '',
  summary: '',
  description: '',
  problem: '',
  solution: '',
  implementation: '',
  expectedBenefit: '',
  timeframe: '',
  icon: 'flag',
  illustrationAssetId: null,
  status: 'active',
  isExample: false,
};

function MilestoneEditor({ slug, initial, onClose }: { slug: PillarSlug; initial: MilestoneForm; onClose: () => void }) {
  const toast = useToast();
  const [m, setM] = useState<MilestoneForm>(initial);
  const keys = [adminKeys.pillar(slug), adminKeys.pillars];
  const save = useAdminMutation((f: MilestoneForm) => {
    const body = {
      title: f.title, summary: f.summary, description: f.description, problem: f.problem, solution: f.solution,
      implementation: f.implementation, expectedBenefit: f.expectedBenefit, timeframe: f.timeframe, icon: f.icon,
      illustrationAssetId: f.illustrationAssetId, status: f.status, isExample: f.isExample,
    };
    return f.id ? api.patch(`/admin/milestones/${f.id}`, body) : api.post('/admin/milestones', { ...body, pillar: slug });
  }, keys);
  const set = <K extends keyof MilestoneForm>(k: K, v: MilestoneForm[K]) => setM((x) => ({ ...x, [k]: v }));
  const area = (k: 'summary' | 'description' | 'problem' | 'solution' | 'implementation' | 'expectedBenefit', label: string, rows = 3) => (
    <Field label={label}>{(id) => <TextArea id={id} rows={rows} value={m[k]} onChange={(e) => set(k, e.target.value)} />}</Field>
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(m, { onSuccess: () => { toast('success', 'Milestone saved to draft.'); onClose(); }, onError: (err) => toast('error', errorMessage(err)) });
      }}
    >
      <Field label="Title">{(id) => <TextInput id={id} required value={m.title} onChange={(e) => set('title', e.target.value)} name="title" />}</Field>
      {area('summary', 'Short description (shown on the card)', 2)}
      {area('description', 'Detailed explanation', 4)}
      {area('problem', 'Problem statement')}
      {area('solution', 'Proposed solution')}
      {area('implementation', 'Implementation method')}
      {area('expectedBenefit', 'Expected benefit')}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Timeframe (optional)">{(id) => <TextInput id={id} value={m.timeframe} onChange={(e) => set('timeframe', e.target.value)} />}</Field>
        <Field label="Icon">
          {(id) => (
            <Select id={id} value={m.icon} onChange={(e) => set('icon', e.target.value as IconName)}>
              {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <MediaPicker label="Optional illustration" value={m.illustrationAssetId} onChange={(id) => set('illustrationAssetId', id)} />
      <Toggle label="Visible on the roadmap" description="Hidden milestones stay in the draft but are not published." checked={m.status === 'active'} onChange={(v) => set('status', v ? 'active' : 'hidden')} />
      <Toggle label="Example / placeholder content" description="Shows a public 'Tusaale' badge. Turn off once the text is approved." checked={m.isExample} onChange={(v) => set('isExample', v)} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={save.isPending} icon={<Save className="size-4" aria-hidden />} data-testid="save-milestone">Save milestone</Button>
      </div>
    </form>
  );
}

function PillarForm({ pillar, slug, canWrite }: { pillar: PillarDraft; slug: PillarSlug; canWrite: boolean }) {
  const toast = useToast();
  const [p, setP] = useState(pillar);
  useEffect(() => setP(pillar), [pillar]);
  const save = useAdminMutation(
    (x: PillarDraft) => api.patch(`/admin/pillars/${slug}`, { name: x.name, subtitle: x.subtitle, tagline: x.tagline, description: x.description, conclusion: x.conclusion, icon: x.icon, theme: x.theme }),
    [adminKeys.pillar(slug), adminKeys.pillars],
  );
  const set = <K extends keyof PillarDraft>(k: K, v: PillarDraft[K]) => setP((x) => ({ ...x, [k]: v }));
  return (
    <Card title="Pillar text">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(p, { onSuccess: () => toast('success', 'Pillar draft saved.'), onError: (err) => toast('error', errorMessage(err)) });
        }}
      >
        <Field label="Name">{(id) => <TextInput id={id} value={p.name} onChange={(e) => set('name', e.target.value)} disabled={!canWrite} />}</Field>
        <Field label="Subtitle">{(id) => <TextInput id={id} value={p.subtitle} onChange={(e) => set('subtitle', e.target.value)} disabled={!canWrite} />}</Field>
        <Field label="Tagline" className="md:col-span-2">{(id) => <TextInput id={id} value={p.tagline} onChange={(e) => set('tagline', e.target.value)} disabled={!canWrite} />}</Field>
        <Field label="Description" className="md:col-span-2">{(id) => <TextArea id={id} value={p.description} onChange={(e) => set('description', e.target.value)} disabled={!canWrite} />}</Field>
        <Field label="Conclusion text" className="md:col-span-2">{(id) => <TextArea id={id} rows={2} value={p.conclusion} onChange={(e) => set('conclusion', e.target.value)} disabled={!canWrite} />}</Field>
        <Field label="Icon">
          {(id) => <Select id={id} value={p.icon} onChange={(e) => set('icon', e.target.value)} disabled={!canWrite}>{ICON_NAMES.map((n) => <option key={n}>{n}</option>)}</Select>}
        </Field>
        <Field label="Visual theme">
          {(id) => <Select id={id} value={p.theme} onChange={(e) => set('theme', e.target.value)} disabled={!canWrite}>{PILLAR_THEMES.map((n) => <option key={n}>{n}</option>)}</Select>}
        </Field>
        {canWrite && (
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" loading={save.isPending} icon={<Save className="size-4" aria-hidden />}>Save pillar draft</Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export default function RoadmapEditorPage() {
  const { slug } = useParams();
  const me = useMe();
  const toast = useToast();
  const validSlug = isPillarSlug(slug) ? slug : 'waxbarasho';
  const q = usePillarDraft(validSlug);
  const [editing, setEditing] = useState<MilestoneForm | null>(null);
  const canWrite = hasPermission(me.data?.user.role, 'content:write');
  const keys = [adminKeys.pillar(validSlug), adminKeys.pillars];
  const reorder = useAdminMutation((ids: string[]) => api.put(`/admin/pillars/${validSlug}/milestone-order`, { ids }), keys);
  const remove = useAdminMutation((id: string) => api.del(`/admin/milestones/${id}`), keys);

  if (!isPillarSlug(slug)) return <ErrorState title="Unknown roadmap" />;
  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  const { pillar, milestones, state } = q.data;

  const move = (index: number, dir: -1 | 1) => {
    const ids = milestones.map((m) => m.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    reorder.mutate(ids, { onError: (e) => toast('error', errorMessage(e)) });
  };

  return (
    <>
      <Link to="/admin/roadmaps" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> All roadmaps</Link>
      <PageHeader
        title={`${pillar.name} roadmap`}
        description="Edits are saved as a draft. Preview them, then publish to update the public site."
        actions={<VersionHistory entityType="pillar" entityId={slug} invalidate={keys} />}
      />
      <PublishBar state={state} basePath={`/admin/pillars/${slug}`} previewHref={`/admin/preview/roadmap/${slug}`} canUnpublish invalidate={keys} />
      <div className="space-y-6">
        <PillarForm pillar={pillar} slug={slug} canWrite={canWrite} />
        <Card
          title={`Milestones (${milestones.length})`}
          actions={canWrite && <Button size="sm" icon={<Plus className="size-4" aria-hidden />} onClick={() => setEditing({ ...EMPTY_MILESTONE })} data-testid="add-milestone">Add milestone</Button>}
        >
          {milestones.length === 0 ? (
            <p className="text-sm text-muted">No milestones yet.</p>
          ) : (
            <ol className="divide-y divide-line" aria-label="Milestones in display order">
              {milestones.map((m, i) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3" data-testid="admin-milestone-row">
                  <span className="w-8 text-sm tabular-nums text-muted">{String(i + 1).padStart(2, '0')}</span>
                  <Icon name={m.icon} className="size-5 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.title}</p>
                    <p className="truncate text-xs text-muted">{m.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.status === 'hidden' && <StatusPill tone="gray">Hidden</StatusPill>}
                    {m.isExample && <StatusPill tone="amber">Example</StatusPill>}
                  </div>
                  {canWrite && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" aria-label={`Move ${m.title} up`} disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}><ArrowUp className="size-4" aria-hidden /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Move ${m.title} down`} disabled={i === milestones.length - 1 || reorder.isPending} onClick={() => move(i, 1)}><ArrowDown className="size-4" aria-hidden /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Edit ${m.title}`} onClick={() => setEditing({ ...m })} data-testid="edit-milestone"><Pencil className="size-4" aria-hidden /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Delete ${m.title}`} onClick={() => {
                        if (window.confirm(`Delete "${m.title}" from the draft? Published versions are kept in history.`)) remove.mutate(m.id, { onSuccess: () => toast('success', 'Milestone deleted from draft.'), onError: (e) => toast('error', errorMessage(e)) });
                      }}><Trash2 className="size-4" aria-hidden /></Button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit milestone' : 'New milestone'} closeLabel="Close">
        {editing && <MilestoneEditor slug={slug} initial={editing} onClose={() => setEditing(null)} />}
      </Dialog>
    </>
  );
}
