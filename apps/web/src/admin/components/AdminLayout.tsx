import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  ExternalLink,
  FileClock,
  Image,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  PieChart,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { hasPermission, type Permission } from '@reveal/shared';
import { api } from '../../lib/api';
import { cx } from '../../components/ui/primitives';
import { useMe } from '../api';

const NAV: Array<{ to: string; label: string; icon: typeof Map; permission?: Permission; end?: boolean }> = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/candidate', label: 'Candidate Profile', icon: UserRound, permission: 'content:read' },
  { to: '/admin/roadmaps', label: 'Roadmaps & Milestones', icon: Map, permission: 'content:read' },
  { to: '/admin/feedback', label: 'Feedback Inbox', icon: Inbox, permission: 'feedback:read' },
  { to: '/admin/feedback-analytics', label: 'Feedback Analytics', icon: PieChart, permission: 'analytics:read' },
  { to: '/admin/analytics', label: 'Website Analytics', icon: BarChart3, permission: 'analytics:read' },
  { to: '/admin/media', label: 'Media Library', icon: Image, permission: 'media:write' },
  { to: '/admin/settings', label: 'Website Settings', icon: Settings, permission: 'settings:write' },
  { to: '/admin/security', label: 'Admin Security', icon: ShieldCheck },
  { to: '/admin/audit', label: 'Audit Logs', icon: FileClock, permission: 'audit:read' },
];

export function AdminLayout() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const role = me.data?.user.role;

  useEffect(() => {
    setOpen(false);
    window.setTimeout(() => document.querySelector<HTMLElement>('main [data-route-focus]')?.focus({ preventScroll: true }), 50);
  }, [location.pathname]);

  const logout = async () => {
    await api.post('/admin/auth/logout').catch(() => undefined);
    qc.clear();
    navigate('/admin/login', { replace: true });
    window.location.reload();
  };

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {NAV.filter((n) => !n.permission || hasPermission(role, n.permission)).map(({ to, label, icon: I, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cx('flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition', isActive ? 'bg-primary/10 font-semibold text-primary-strong' : 'text-muted hover:bg-ink/5 hover:text-ink')
          }
        >
          <I className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <a href="#admin-main" className="sr-only-focusable fixed left-4 top-4 z-50 rounded-full bg-primary-strong px-4 py-2 text-white">Skip to content</a>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="admin-sidebar" aria-label="Menu" className="grid size-11 place-items-center rounded-xl hover:bg-ink/5">
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
        <span className="font-display text-sm font-bold tracking-[0.2em]">THE REVEAL · ADMIN</span>
        <span className="size-11" />
      </header>
      <div className="flex">
        <aside
          id="admin-sidebar"
          className={cx(
            'fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-line bg-bg-soft p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh',
            open ? 'flex' : 'hidden',
          )}
        >
          <div className="mb-6 hidden px-2 pt-2 lg:block">
            <p className="font-display text-sm font-bold tracking-[0.2em]">THE REVEAL</p>
            <p className="text-xs text-muted">Campaign management</p>
          </div>
          <div className="flex-1 overflow-y-auto">{nav}</div>
          <div className="mt-4 border-t border-line pt-4">
            <a href="/vision" target="_blank" rel="noopener" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-ink/5 hover:text-ink">
              <ExternalLink className="size-4" aria-hidden /> View public site
            </a>
            <div className="mt-2 flex items-center justify-between gap-2 px-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{me.data?.user.username}</p>
                <p className="text-xs capitalize text-muted">{role}</p>
              </div>
              <button type="button" onClick={logout} className="grid size-11 place-items-center rounded-xl text-muted hover:bg-ink/5 hover:text-ink" aria-label="Sign out" data-testid="logout">
                <LogOut className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </aside>
        {open && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
        <main id="admin-main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
