import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { hasPermission, type HotspotKey } from '@reveal/shared';
import { api } from '../../lib/api';
import { Button, ErrorState, Spinner } from '../../components/ui/primitives';
import { adminKeys, useAdminMutation, useCandidateDraft, useMe, useMedia, type Anchor, type CandidateDraft } from '../api';
import { Card, Field, PageHeader, TextArea, TextInput, Toggle, errorMessage, linesToList, useToast } from '../components/ui';
import { PublishBar, VersionHistory } from '../components/publishing';
import { MediaPicker } from '../components/media';
import { FacePointEditor, HotspotEditor } from '../components/HotspotEditor';

type EnForm = { title: string; introduction: string; biography: string; motivation: string; vision: string; education: string; experience: string; skills: string; achievements: string };
type Form = Omit<CandidateDraft, 'id' | 'education' | 'experience' | 'skills' | 'achievements' | 'en'> & {
  education: string;
  experience: string;
  skills: string;
  achievements: string;
  en: EnForm;
};

const toForm = (d: CandidateDraft): Form => ({
  ...d,
  education: d.education.join('\n'),
  experience: d.experience.join('\n'),
  skills: d.skills.join('\n'),
  achievements: d.achievements.join('\n'),
  en: {
    title: d.en?.title ?? '', introduction: d.en?.introduction ?? '', biography: d.en?.biography ?? '', motivation: d.en?.motivation ?? '', vision: d.en?.vision ?? '',
    education: (d.en?.education ?? []).join('\n'), experience: (d.en?.experience ?? []).join('\n'),
    skills: (d.en?.skills ?? []).join('\n'), achievements: (d.en?.achievements ?? []).join('\n'),
  },
});

export default function CandidatePage() {
  const q = useCandidateDraft();
  const me = useMe();
  const media = useMedia();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const canWrite = hasPermission(me.data?.user.role, 'content:write');
  useEffect(() => {
    if (q.data && !form) setForm(toForm(q.data.draft));
  }, [q.data, form]);

  const save = useAdminMutation((f: Form) => {
    const { id: _id, ...rest } = f as Form & { id?: string };
    return api.patch('/admin/candidate', {
      name: rest.name,
      title: rest.title,
      introduction: rest.introduction,
      biography: rest.biography,
      motivation: rest.motivation,
      vision: rest.vision,
      education: linesToList(rest.education),
      experience: linesToList(rest.experience),
      skills: linesToList(rest.skills),
      achievements: linesToList(rest.achievements),
      portraitAssetId: rest.portraitAssetId,
      portraitFocal: rest.portraitFocal ?? { x: 0.5, y: 0.36 },
      pose: { assetId: rest.pose.assetId, isPlaceholder: rest.pose.isPlaceholder, focal: rest.pose.focal, anchors: rest.pose.anchors },
      en: {
        ...rest.en,
        education: linesToList(rest.en.education),
        experience: linesToList(rest.en.experience),
        skills: linesToList(rest.en.skills),
        achievements: linesToList(rest.en.achievements),
      },
    });
  }, [adminKeys.candidate]);

  if (q.isPending || !form) return <Spinner />;
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const poseImage = media.data?.find((m) => m.id === form.pose.assetId) ?? null;
  const portraitImage = media.data?.find((m) => m.id === form.portraitAssetId) ?? null;

  const text = (k: 'name' | 'title', label: string, hint?: string) => (
    <Field label={label} hint={hint}>{(id, d) => <TextInput id={id} aria-describedby={d} value={form[k]} onChange={(e) => set(k, e.target.value)} disabled={!canWrite} />}</Field>
  );
  const area = (k: 'introduction' | 'biography' | 'motivation' | 'vision' | 'education' | 'experience' | 'skills' | 'achievements', label: string, hint?: string, rows = 4) => (
    <Field label={label} hint={hint}>{(id, d) => <TextArea id={id} rows={rows} aria-describedby={d} value={form[k]} onChange={(e) => set(k, e.target.value)} disabled={!canWrite} />}</Field>
  );

  const enField = (k: keyof EnForm, label: string, rows = 3) => (
    <Field label={label}>
      {(id) =>
        rows === 1 ? (
          <TextInput id={id} lang="en" value={form.en[k]} onChange={(e) => set('en', { ...form.en, [k]: e.target.value })} disabled={!canWrite} />
        ) : (
          <TextArea id={id} lang="en" rows={rows} value={form.en[k]} onChange={(e) => set('en', { ...form.en, [k]: e.target.value })} disabled={!canWrite} />
        )
      }
    </Field>
  );

  return (
    <>
      <PageHeader
        title="Candidate profile"
        description="Only enter information approved by the candidate. Empty sections are hidden on the public site — nothing is invented."
        actions={<VersionHistory entityType="candidate" entityId="main" invalidate={[adminKeys.candidate]} />}
      />
      <PublishBar state={q.data.state} basePath="/admin/candidate" previewHref="/admin/preview/vision" invalidate={[adminKeys.candidate]} />
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form, { onSuccess: () => toast('success', 'Draft saved.'), onError: (err) => toast('error', errorMessage(err)) });
        }}
      >
        <Card title="Identity">
          <div className="grid gap-4 md:grid-cols-2">
            {text('name', 'Full name')}
            {text('title', 'Title / role line')}
          </div>
        </Card>
        <Card title="Biography">
          <div className="grid gap-4">
            {area('introduction', 'Short introduction', 'Shown at the top of the About panel.')}
            {area('biography', 'Biography', 'Separate paragraphs with a blank line.', 6)}
            <div className="grid gap-4 md:grid-cols-2">
              {area('education', 'Educational background', 'One item per line.')}
              {area('experience', 'Relevant experience', 'One item per line.')}
              {area('skills', 'Skills', 'One skill per line.')}
              {area('achievements', 'Verified achievements', 'One per line. Only include verified information.')}
            </div>
            {area('motivation', 'Motivation for candidacy')}
            {area('vision', 'Leadership vision')}
          </div>
        </Card>
        <Card title="English translation (optional)">
          <p className="mb-4 text-sm text-muted">Shown when a visitor switches the site to English. Empty fields fall back to the Somali text.</p>
          <div className="grid gap-4">
            {enField('title', 'Title / role line (English)', 1)}
            {enField('introduction', 'Short introduction (English)')}
            {enField('biography', 'Biography (English)', 6)}
            <div className="grid gap-4 md:grid-cols-2">
              {enField('education', 'Educational background (English, one per line)')}
              {enField('experience', 'Relevant experience (English, one per line)')}
              {enField('skills', 'Skills (English, one per line)')}
              {enField('achievements', 'Verified achievements (English, one per line)')}
            </div>
            {enField('motivation', 'Motivation for candidacy (English)')}
            {enField('vision', 'Leadership vision (English)')}
          </div>
        </Card>
        <Card title="Photos">
          <div className="grid gap-6 md:grid-cols-2">
            <MediaPicker label="Intro portrait (head & shoulders)" value={form.portraitAssetId} onChange={(id) => set('portraitAssetId', id)} />
            <MediaPicker label="Interactive pose (arms open)" value={form.pose.assetId} onChange={(id) => set('pose', { ...form.pose, assetId: id })} />
          </div>
          <div className="mt-4">
            <Toggle
              label="Pose photo is a temporary placeholder"
              description="Shows a 'Sawir ku meel gaar ah' badge on the public site until the approved arms-open photo is uploaded."
              checked={form.pose.isPlaceholder}
              onChange={(v) => set('pose', { ...form.pose, isPlaceholder: v })}
            />
          </div>
        </Card>
        <Card title="Intro portrait — face point for the “?”">
          <FacePointEditor image={portraitImage} value={form.portraitFocal ?? { x: 0.5, y: 0.36 }} onChange={(a) => set('portraitFocal', a)} />
        </Card>
        <Card title="Hotspot positions (interactive pose)">
          <HotspotEditor
            image={poseImage}
            anchors={form.pose.anchors}
            onChange={(anchors: Record<HotspotKey, Anchor>) => set('pose', { ...form.pose, anchors })}
          />
        </Card>
        {canWrite && (
          <div className="sticky bottom-4 z-10 flex justify-end">
            <Button type="submit" loading={save.isPending} icon={<Save className="size-4" aria-hidden />} className="shadow-2xl">Save draft</Button>
          </div>
        )}
      </form>
    </>
  );
}
