import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { Lock } from 'lucide-react';
import { loginSchema } from '@reveal/shared';
import { api, ApiRequestError } from '../../lib/api';
import { Button } from '../../components/ui/primitives';
import { adminKeys } from '../api';
import { Field, TextInput } from '../components/ui';

type Values = { username: string; password: string };

export default function LoginPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await api.post<{ user: unknown; permissions: unknown }>('/admin/auth/login', values);
      qc.setQueryData(adminKeys.me, { user: res.user, permissions: res.permissions });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin', { replace: true });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Sign-in failed');
    }
  });

  return (
    <main className="hero-backdrop grid min-h-dvh place-items-center px-4">
      <form onSubmit={onSubmit} noValidate className="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-2xl" aria-labelledby="login-title">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-primary/15 text-glow"><Lock className="size-5" aria-hidden /></span>
          <div>
            <h1 id="login-title" className="text-xl font-bold">Admin sign in</h1>
            <p className="text-xs text-muted">THE REVEAL campaign management</p>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Username" error={formState.errors.username?.message}>
            {(id, d) => <TextInput id={id} aria-describedby={d} autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={!!formState.errors.username} {...register('username')} />}
          </Field>
          <Field label="Password" error={formState.errors.password?.message}>
            {(id, d) => <TextInput id={id} type="password" aria-describedby={d} autoComplete="current-password" aria-invalid={!!formState.errors.password} {...register('password')} />}
          </Field>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger" data-testid="login-error">{error}</p>}
        <Button type="submit" className="mt-6 w-full" loading={formState.isSubmitting}>Sign in</Button>
        <p className="mt-4 text-center text-xs text-muted">Accounts are provisioned by an owner. There is no self-registration.</p>
      </form>
    </main>
  );
}
