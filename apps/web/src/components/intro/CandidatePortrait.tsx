import { motion } from 'motion/react';
import type { PublicImage } from '@reveal/shared';
import { responsiveImage } from '../../lib/images';
import { cx } from '../ui/primitives';

interface Props {
  image: PublicImage | null;
  alt: string;
  sizes?: string;
  className?: string;
  /** Animate upward + fade in on mount. */
  entrance?: boolean;
  priority?: boolean;
  masked?: 'radial' | 'bottom' | 'none';
}

/** Responsive candidate portrait with WebP sources, stable aspect ratio and a soft blend into the page. */
export function CandidatePortrait({ image, alt, sizes = '(max-width: 640px) 90vw, 520px', className, entrance, priority, masked = 'radial' }: Props) {
  const maskClass = masked === 'radial' ? 'portrait-mask' : masked === 'bottom' ? 'portrait-mask-soft' : '';
  if (!image) {
    return (
      <div className={cx('relative grid aspect-[4/5] w-full place-items-center rounded-[2rem] border border-dashed border-line bg-surface/60', className)} role="img" aria-label={alt}>
        <svg viewBox="0 0 120 150" className="w-1/2 text-line" aria-hidden>
          <circle cx="60" cy="48" r="26" fill="currentColor" />
          <path d="M10 150c4-40 26-62 50-62s46 22 50 62z" fill="currentColor" />
        </svg>
      </div>
    );
  }
  const img = responsiveImage(image, sizes);
  const picture = (
    <picture>
      {img.webpSrcSet && <source type="image/webp" srcSet={img.webpSrcSet} sizes={img.sizes} />}
      <img
        src={img.src}
        width={img.width}
        height={img.height}
        alt={alt}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={cx('block h-auto w-full select-none object-contain', maskClass)}
        draggable={false}
      />
    </picture>
  );
  if (!entrance) return <div className={cx('relative w-full', className)} style={{ aspectRatio: `${image.width} / ${image.height}` }}>{picture}</div>;
  return (
    <motion.div
      className={cx('relative w-full', className)}
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
    >
      {picture}
    </motion.div>
  );
}
