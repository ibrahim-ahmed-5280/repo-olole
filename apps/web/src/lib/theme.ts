import type { PillarTheme } from '@reveal/shared';

/**
 * JS mirror of the CSS design tokens in src/styles/index.css (@theme).
 * Use these only where CSS classes can't reach (SVG attributes, Recharts props, inline gradients).
 * Palette: white university theme from the Hormuud University logo (green #1A8556, blue #2E89BB).
 */
export const TOKENS = {
  bg: '#FFFFFF',
  bgSoft: '#F3F8F5',
  surface: '#FFFFFF',
  ink: '#162B25',
  muted: '#536960',
  line: '#DCE9E2',
  lineStrong: '#C3D8CC',
  brandGreen: '#1A8556',
  brandGreenStrong: '#146B45',
  brandBlue: '#2E89BB',
  secondary: '#1F6F99', // text-safe blue
  teal: '#0F6B6F',
  greenSoft: '#E7F4EC',
  blueSoft: '#E8F3F8',
  success: '#157A4C',
  danger: '#C0313D',
  warn: '#9A6700',
} as const;

export interface ThemeTokens {
  color: string;
  glow: string;
  soft: string;
  onColor: string;
  label: string;
  /** Optional gradient used for emphasis (Hoggaan). */
  gradient?: string;
}

/** Per-pillar identity on the white theme. All `color` values meet WCAG AA as text on white. */
export const PILLAR_THEME: Record<PillarTheme, ThemeTokens> = {
  education: { color: TOKENS.secondary, glow: 'rgba(46,137,187,0.28)', soft: 'rgba(46,137,187,0.10)', onColor: '#FFFFFF', label: 'education' },
  unity: { color: TOKENS.brandGreen, glow: 'rgba(26,133,86,0.28)', soft: 'rgba(26,133,86,0.10)', onColor: '#FFFFFF', label: 'unity' },
  leadership: {
    color: TOKENS.teal,
    glow: 'rgba(15,107,111,0.28)',
    soft: 'rgba(15,107,111,0.10)',
    onColor: '#FFFFFF',
    label: 'leadership',
    gradient: `linear-gradient(135deg, ${TOKENS.brandGreen}, ${TOKENS.brandBlue})`,
  },
};

export const BRAND = {
  blue: TOKENS.brandBlue,
  green: TOKENS.brandGreen,
  glow: TOKENS.secondary,
  glowRgba: 'rgba(46,137,187,0.28)',
};

export function themeStyle(theme: PillarTheme): React.CSSProperties {
  const t = PILLAR_THEME[theme];
  return { ['--accent' as string]: t.color, ['--accent-glow' as string]: t.glow, ['--accent-soft' as string]: t.soft };
}
