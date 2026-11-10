import { useState } from 'react';
import { KeyRound, UserPlus, XCircle } from 'lucide-react';
import { ROLES, hasPermission, type Role } from '@reveal/shared';
import { api } from '../../lib/api';
import { Button, Spinner } from '../../components/ui/primitives';
import { adminKeys, useAdminMutation, useMe, useSessions, useUsers } from '../api';
import { Card, Field, PageHeader, Select, StatusPill, TextInput, errorMessage, fmtDate, useToast } from '../components/ui';

function ChangePassword() {
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const m = useAdminMutation(() => api.post<{ otherSessionsRevoked: number }>('/admin/auth/password', { currentPassword: cur, newPassword: next }), [adminKeys.sessions]);
  return (
    <Card title="Change password">
      <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => {
        e.preventDefault();
        m.mutate(undefined, { onSuccess: (r) => { toast('success', `Password changed. ${r.otherSessionsRevoked} other session(s) signed out.`); setCur(''); setNext(''); }, onError: (err) => toast('error', errorMessage(err)) });
      }}>
        <Field label="Current password">{(id) => <TextInput id={id} type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required />}</Field>
        <Field label="New password" hint="12+ characters with upper-case, lower-case and a number.">{(id, d) => <TextInput id={id} aria-describedby={d} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={12} />}</Field>
        <Button type="submit" loading={m.isPending} icon={<KeyRound className="size-4" aria-hidden />}>Update</Button>
      </form>
    </Card>
  );
}

function Sessions() {
  const q = useSessions();
  const toast = useToast();
  const revoke = useAdminMutation((id: string) => api.del(`/admin/auth/sessions/${id}`), [adminKeys.sessions]);
  return (
    <Card title="Your active sessions">
      {q.isPending ? <Spinner /> : (
        <ul className="divide-y divide-line text-sm">
          {q.data?.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate">{s.userAgent || 'Unknown device'}</p>
                <p className="text-xs text-muted">Last active {fmtDate(s.lastSeenAt)} · expires {fmtDate(s.expiresAt)}</p>
              </div>
              {s.current ? <StatusPill tone="green">This session</StatusPill> : (
                <Button size="sm" variant="ghost" icon={<XCircle className="size-4" aria-hidden />} onClick={() => revoke.mutate(s.id, { onSuccess: () => toast('success', 'Session revoked.'), onError: (e) => toast('error', errorMessage(e)) })}>Revoke</Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Users() {
  const toast = useToast();
  const users = useUsers(true);
  const [form, setForm] = useState({ username: '', email: '', role: 'editor' as Role, password: '' });
  const create = useAdminMutation(() => api.post('/admin/users', { username: form.username, role: form.role, password: form.password, ...(form.email ? { email: form.email } : {}) }), [adminKeys.users]);
  const update = useAdminMutation(({ id, body }: { id: string; body: object }) => api.patch(`/admin/users/${id}`, body), [adminKeys.users]);
  const revoke = useAdminMutation((id: string) => api.post(`/admin/users/${id}/revoke-sessions`, {}), []);
  return (
    <Card title="Admin accounts">
      <p className="mb-4 text-sm text-muted"><strong>Owner</strong>: everything. <strong>Editor</strong>: edits profile, roadmaps and media; submits for publication. <strong>Reviewer</strong>: moderates feedback and views aggregate analytics.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-xs uppercase text-muted"><tr><th scope="col" className="py-2">User</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Last sign-in</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <th scope="row" className="py-2 font-medium">{u.username}<span className="block text-xs font-normal text-muted">{u.email}</span></th>
                <td>
                  <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.username}</label>
                  <Select id={`role-${u.id}`} value={u.role} className="mt-0 w-32" onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value } }, { onError: (err) => toast('error', errorMessage(err)) })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </td>
                <td><StatusPill tone={u.status === 'active' ? 'green' : 'gray'}>{u.status}</StatusPill></td>
                <td className="text-muted">{fmtDate(u.lastLoginAt)}</td>
                <td className="py-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: u.id, body: { status: u.status === 'active' ? 'disabled' : 'active' } }, { onError: (err) => toast('error', errorMessage(err)) })}>{u.status === 'active' ? 'Disable' : 'Enable'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => revoke.mutate(u.id, { onSuccess: () => toast('success', 'Sessions revoked.'), onError: (err) => toast('error', errorMessage(err)) })}>Sign out everywhere</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="mt-6 grid gap-3 rounded-2xl border border-dashed border-line p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end" onSubmit={(e) => {
        e.preventDefault();
        create.mutate(undefined, { onSuccess: () => { toast('success', 'Account created. Share the password through a secure channel.'); setForm({ username: '', email: '', role: 'editor', password: '' }); }, onError: (err) => toast('error', errorMessage(err)) });
      }}>
        <Field label="Username">{(id) => <TextInput id={id} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoComplete="off" />}</Field>
        <Field label="Email (optional)">{(id) => <TextInput id={id} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
        <Field label="Role">{(id) => <Select id={id} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Select>}</Field>
        <Field label="Initial password">{(id) => <TextInput id={id} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={12} />}</Field>
        <Button type="submit" loading={create.isPending} icon={<UserPlus className="size-4" aria-hidden />}>Create</Button>
      </form>
    </Card>
  );
}

export default function SecurityPage() {
  const me = useMe();
  return (
    <>
      <PageHeader title="Admin security" description="Sessions expire automatically after inactivity and at a fixed lifetime. Passwords are hashed with Argon2id." />
      <div className="space-y-6">
        <ChangePassword />
        <Sessions />
        {hasPermission(me.data?.user.role, 'users:manage') && <Users />}
      </div>
    </>
  );
}
