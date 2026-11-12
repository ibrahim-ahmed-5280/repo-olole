import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import type { PublicImage } from '@reveal/shared';
import { responsiveImage } from '../../lib/images';
import { cx } from '../ui/primitives';

interface Props {
  image: PublicImage | null;
  alt: string;
  sizes?: string;
  className?: string;
  /** Animate into place + fade in on mount. */
  entrance?: boolean;
  /** 'bottom' rises up (default); 'top' drops down from above into the final position. */
  entranceFrom?: 'top' | 'bottom';
  /** Absolute start offset in px (defaults: 72 from bottom, 160 from top). */
  entranceOffset?: number;
  entranceDuration?: number;
  /** Overlays (e.g. the mystery "?") rendered inside the portrait box so they move with it. */
  children?: ReactNode;
  priority?: boolean;
  /**
   * radial/bottom: blend the photo into the page with a mask.
   * frame: present a studio photo as a framed portrait with a Hormuud blue→green edge.
   */
  /** cutout: a background-free photo on white with a soft Hormuud-green arch behind the person. */
  masked?: 'radial' | 'bottom' | 'frame' | 'cutout' | 'none';
}

/** Responsive candidate portrait with WebP sources, stable aspect ratio and either a mask or a frame. */
export function CandidatePortrait({ image, alt, sizes = '(max-width: 640px) 90vw, 520px', className, entrance, entranceFrom = 'bottom', entranceOffset, entranceDuration = 1.05, priority, masked = 'radial', children }: Props) {
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
  const framed = masked === 'frame';
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
        className={cx('block w-full select-none', framed ? 'h-full object-cover' : 'h-auto object-contain', maskClass)}
        draggable={false}
      />
    </picture>
  );
  const content = framed ? <div className="portrait-frame-inner h-full w-full">{picture}</div> : picture;
  const boxClass = cx('relative w-full', framed && 'portrait-frame', masked === 'cutout' && 'portrait-cutout', className);
  const style = { aspectRatio: `${image.width} / ${image.height}` };
  if (!entrance) return <div className={boxClass} style={style}>{content}{children}</div>;
  return (
    <motion.div
      className={boxClass}
      style={style}
      initial={
        entranceFrom === 'top'
          ? { opacity: 0, y: -Math.abs(entranceOffset ?? 160) }
          : { opacity: 0, y: Math.abs(entranceOffset ?? 72), scale: 0.97 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // Cinematic ease-out: fast start, long gentle settle, no overshoot/bounce.
      transition={{ duration: entranceDuration, ease: [0.16, 1, 0.3, 1] }}
    >
      {content}
      {children}
    </motion.div>
  );
}
