import type { PillarTheme } from '@reveal/shared';

export interface ThemeTokens {
  color: string;
  glow: string;
  soft: string;
  onColor: string;
  label: string;
}

/** Per-pillar visual identity. Colors meet WCAG AA against the #07111F background. */
export const PILLAR_THEME: Record<PillarTheme, ThemeTokens> = {
  education: { color: '#3B93FF', glow: 'rgba(59,147,255,0.45)', soft: 'rgba(59,147,255,0.12)', onColor: '#07111F', label: 'education' },
  unity: { color: '#19B897', glow: 'rgba(25,184,151,0.45)', soft: 'rgba(25,184,151,0.12)', onColor: '#07111F', label: 'unity' },
  leadership: { color: '#E6B85A', glow: 'rgba(230,184,90,0.45)', soft: 'rgba(230,184,90,0.12)', onColor: '#07111F', label: 'leadership' },
};

export function themeStyle(theme: PillarTheme): React.CSSProperties {
  const t = PILLAR_THEME[theme];
  return { ['--accent' as string]: t.color, ['--accent-glow' as string]: t.glow, ['--accent-soft' as string]: t.soft };
}
