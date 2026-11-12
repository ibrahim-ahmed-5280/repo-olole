import { useT } from '../../i18n';
import { cx } from '../ui/primitives';

/**
 * Hormuud University logo + site name. The logo keeps its natural aspect ratio (128×148);
 * only its height is set, so it is never stretched or distorted.
 */
/** `textHiddenBelow`: on narrow screens show only the logo (the name stays available to screen readers). */
export function BrandMark({ className, compactBelow360 = false, textHiddenBelow }: { className?: string; compactBelow360?: boolean; textHiddenBelow?: 640 }) {
  const t = useT();
  return (
    <span className={cx('flex min-w-0 items-center gap-2.5', className)}>
      <picture className="shrink-0">
        <source type="image/webp" srcSet="/brand/hormuud-university-logo.webp" />
        <img
          src="/brand/hormuud-university-logo.png"
          width={128}
          height={148}
          alt={t.brand.logoAlt}
          className="block h-9 w-auto sm:h-10"
          decoding="async"
          data-testid="brand-logo"
        />
      </picture>
      <span aria-hidden className={cx('h-7 w-px shrink-0 bg-line', textHiddenBelow && 'max-sm:hidden')} />
      <span className={cx('flex min-w-0 flex-col leading-tight', textHiddenBelow && 'max-sm:sr-only')}>
        {/* Long candidate-position title: hidden on mobile (< 768px), shown in full from tablet (md) up. */}
        <span className="hidden font-display text-sm font-bold leading-snug text-ink md:line-clamp-2 md:max-w-[26rem]" data-testid="brand-title">{t.brand.title}</span>
        <span className={cx('whitespace-nowrap text-[11px] font-medium text-primary', compactBelow360 && 'max-[359px]:hidden')}>{t.brand.university}</span>
      </span>
    </span>
  );
}
