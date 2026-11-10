import type { PublicImage } from '@reveal/shared';

/** Builds responsive <img>/<source> attributes from server-generated WebP variants. */
export function responsiveImage(image: PublicImage, sizes: string) {
  const webp = image.variants.filter((v) => v.format === 'webp').sort((a, b) => a.width - b.width);
  return {
    src: image.url,
    width: image.width,
    height: image.height,
    webpSrcSet: webp.length ? webp.map((v) => `${v.url} ${v.width}w`).join(', ') : undefined,
    sizes,
  };
}
