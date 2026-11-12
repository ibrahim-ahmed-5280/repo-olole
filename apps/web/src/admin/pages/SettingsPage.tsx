import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { SiteSettingsDTO } from '@reveal/shared';
import { api } from '../../lib/api';
import { Button, ErrorState, Spinner } from '../../components/ui/primitives';
import { adminKeys, useAdminMutation, useSettingsDraft } from '../api';
import { Card, Field, PageHeader, TextArea, TextInput, Toggle, errorMessage, useToast } from '../components/ui';
import { PublishBar, VersionHistory } from '../components/publishing';

export default function SettingsPage() {
  const q = useSettingsDraft();
  const toast = useToast();
  const [s, setS] = useState<SiteSettingsDTO | null>(null);
  useEffect(() => { if (q.data && !s) setS(q.data.draft); }, [q.data, s]);
  const save = useAdminMutation((x: SiteSettingsDTO) => {
    const { publishedAt: _p, ...body } = x;
    return api.patch('/admin/settings', body);
  }, [adminKeys.settings]);
  if (q.isPending || !s) return <Spinner />;
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  const set = <K extends keyof SiteSettingsDTO>(k: K, v: SiteSettingsDTO[K]) => setS((x) => (x ? { ...x, [k]: v } : x));

  return (
    <>
      <PageHeader title="Website settings" actions={<VersionHistory entityType="settings" entityId="main" invalidate={[adminKeys.settings]} />} />
      <PublishBar state={q.data.state} basePath="/admin/settings" invalidate={[adminKeys.settings]} settings />
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save.mutate(s, { onSuccess: () => toast('success', 'Settings draft saved. Publish to apply.'), onError: (err) => toast('error', errorMessage(err)) }); }}>
        <Card title="Branding">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Site name">{(id) => <TextInput id={id} value={s.branding.siteName} onChange={(e) => set('branding', { ...s.branding, siteName: e.target.value })} />}</Field>
            <Field label="Tagline">{(id) => <TextInput id={id} value={s.branding.tagline} onChange={(e) => set('branding', { ...s.branding, tagline: e.target.value })} />}</Field>
            <Field label="Campaign context (footer)" className="md:col-span-2">{(id) => <TextInput id={id} value={s.branding.campaignContext} onChange={(e) => set('branding', { ...s.branding, campaignContext: e.target.value })} />}</Field>
          </div>
        </Card>
        <Card title="Experience">
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle label="Animations enabled" description="When off, all visitors get the reduced-motion experience." checked={s.animationsEnabled} onChange={(v) => set('animationsEnabled', v)} />
            <Toggle label="Mystery intro enabled" description="When off, visitors land directly on the interactive candidate." checked={s.introEnabled} onChange={(v) => set('introEnabled', v)} />
            <Toggle label="Maintenance mode" description="Replaces the public site with a maintenance message." checked={s.maintenanceMode} onChange={(v) => set('maintenanceMode', v)} />
          </div>
          <Field label="Maintenance message" className="mt-4">{(id) => <TextInput id={id} value={s.maintenanceMessage} onChange={(e) => set('maintenanceMessage', e.target.value)} />}</Field>
        </Card>
        <Card title="Social links" actions={<Button size="sm" variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => set('socialLinks', [...s.socialLinks, { label: '', url: 'https://' }])}>Add link</Button>}>
          {s.socialLinks.length === 0 && <p className="text-sm text-muted">No links.</p>}
          <ul className="space-y-3">
            {s.socialLinks.map((l, i) => (
              <li key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <Field label="Label">{(id) => <TextInput id={id} value={l.label} onChange={(e) => set('socialLinks', s.socialLinks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />}</Field>
                <Field label="URL (https only)">{(id) => <TextInput id={id} type="url" value={l.url} onChange={(e) => set('socialLinks', s.socialLinks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />}</Field>
                <Button variant="ghost" aria-label={`Remove link ${l.label}`} onClick={() => set('socialLinks', s.socialLinks.filter((_, j) => j !== i))}><Trash2 className="size-4" aria-hidden /></Button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Privacy notice">
          <Field label="Shown on /privacy (plain text)">{(id) => <TextArea id={id} rows={12} value={s.privacyNotice} onChange={(e) => set('privacyNotice', e.target.value)} />}</Field>
        </Card>
        <Card title="English translation (optional)">
          <p className="mb-4 text-sm text-muted">Shown when a visitor switches the site to English. Empty fields fall back to Somali.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tagline (English)">{(id) => <TextInput id={id} lang="en" value={s.en?.tagline ?? ''} onChange={(e) => set('en', { ...s.en, tagline: e.target.value })} />}</Field>
            <Field label="Maintenance message (English)">{(id) => <TextInput id={id} lang="en" value={s.en?.maintenanceMessage ?? ''} onChange={(e) => set('en', { ...s.en, maintenanceMessage: e.target.value })} />}</Field>
            <Field label="Campaign context (English)" className="md:col-span-2">{(id) => <TextInput id={id} lang="en" value={s.en?.campaignContext ?? ''} onChange={(e) => set('en', { ...s.en, campaignContext: e.target.value })} />}</Field>
            <Field label="Privacy notice (English)" className="md:col-span-2">{(id) => <TextArea id={id} lang="en" rows={10} value={s.en?.privacyNotice ?? ''} onChange={(e) => set('en', { ...s.en, privacyNotice: e.target.value })} />}</Field>
          </div>
        </Card>
        <div className="sticky bottom-4 flex justify-end"><Button type="submit" loading={save.isPending} icon={<Save className="size-4" aria-hidden />}>Save draft</Button></div>
      </form>
    </>
  );
}
