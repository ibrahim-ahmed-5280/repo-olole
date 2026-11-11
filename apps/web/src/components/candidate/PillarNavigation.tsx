import { Link } from 'react-router';
import { ArrowUpRight, HelpCircle } from 'lucide-react';
import type { PillarDTO } from '@reveal/shared';
import { useT } from '../../i18n';
import { track } from '../../lib/analytics';
import { PILLAR_THEME } from '../../lib/theme';
import { Icon } from '../ui/Icon';

/** Text-based equivalent of the interactive portrait — always rendered, fully keyboard and screen-reader accessible. */
export function PillarNavigation({ pillars, onOpenAbout, linkPrefix = '' }: { pillars: PillarDTO[]; onOpenAbout: () => void; linkPrefix?: string }) {
  const t = useT();
  return (
    <nav aria-labelledby="pillar-nav-heading" className="mx-auto w-full max-w-5xl">
      <h2 id="pillar-nav-heading" className="sr-only">{t.vision.navHeading}</h2>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p, i) => {
          const theme = PILLAR_THEME[p.theme];
          return (
            <li key={p.slug}>
              <Link
                to={`${linkPrefix}/roadmap/${p.slug}`}
                onClick={() => track({ type: 'hotspot_click', route: '/vision', pillar: p.slug })}
                className="glass group flex h-full min-h-24 items-start gap-4 rounded-[var(--radius-card)] p-4 transition hover:-translate-y-0.5"
                style={{ borderColor: `${theme.color}55` }}
                data-testid={`pillar-link-${p.slug}`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: theme.soft, color: theme.color }}>
                  <Icon name={p.icon} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                    <span aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                    <span>{p.subtitle}</span>
                  </span>
                  <span className="mt-1 block font-display text-lg font-bold tracking-[0.12em]" style={{ color: theme.color }}>{p.name}</span>
                  <span className="mt-1 block text-sm text-muted">{p.tagline}</span>
                  <span className="mt-2 block text-xs text-muted">{t.vision.milestones(p.milestoneCount)}</span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 text-muted transition group-hover:text-ink" aria-hidden />
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => {
              track({ type: 'about_open', route: '/vision', target: 'about' });
              onOpenAbout();
            }}
            className="glass group flex h-full min-h-24 w-full items-start gap-4 rounded-[var(--radius-card)] border-glow/30 p-4 text-left transition hover:-translate-y-0.5"
            data-testid="about-link"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-glow/10 text-glow">
              <HelpCircle className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-lg font-bold tracking-[0.12em] text-glow">{t.vision.aboutHotspot}</span>
              <span className="mt-1 block text-sm text-muted">{t.about.title}</span>
            </span>
          </button>
        </li>
      </ol>
    </nav>
  );
}
