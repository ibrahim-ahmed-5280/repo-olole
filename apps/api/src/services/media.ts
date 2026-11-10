import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  IMAGE_VARIANT_WIDTHS,
  mediaUrl,
  type AllowedImageMime,
  type MediaAssetDTO,
  type PublicImage,
} from '@reveal/shared';
import { ApiError } from '../lib/http';
import { MediaAsset } from '../models/records';

/** Detects the real image type from its leading bytes (never trusts the client-provided MIME type or file name). */
export function sniffImageType(buf: Buffer): AllowedImageMime | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(buf.toString('ascii', 8, 12))) return 'image/avif';
  return null;
}

const EXT: Record<AllowedImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** Resolves a storage key inside the upload dir, rejecting anything that could escape it. */
export function resolveStoragePath(uploadDir: string, storageKey: string): string {
  mediaUrl(storageKey); // throws for unexpected characters
  const full = path.resolve(uploadDir, storageKey);
  if (!full.startsWith(path.resolve(uploadDir) + path.sep)) throw new ApiError(400, 'INVALID_KEY', 'Invalid media key');
  return full;
}

export interface StoreImageOptions {
  uploadDir: string;
  buffer: Buffer;
  originalName?: string;
  altText?: string;
  uploadedBy?: unknown;
}

/**
 * Validates, re-encodes (stripping EXIF/GPS metadata) and stores an image together with
 * responsive WebP variants. Returns the created MediaAsset document.
 */
export async function storeImage({ uploadDir, buffer, originalName = '', altText = '', uploadedBy = null }: StoreImageOptions) {
  const mime = sniffImageType(buffer);
  if (!mime) throw new ApiError(415, 'UNSUPPORTED_MEDIA', 'Only JPEG, PNG, WebP and AVIF images are accepted');

  let image: sharp.Sharp;
  let meta: sharp.Metadata;
  try {
    image = sharp(buffer, { limitInputPixels: 50_000_000, failOn: 'error' }).rotate();
    meta = await image.metadata();
  } catch {
    throw new ApiError(422, 'INVALID_IMAGE', 'The image could not be read');
  }
  if (!meta.width || !meta.height) throw new ApiError(422, 'INVALID_IMAGE', 'The image has no dimensions');
  // After auto-rotation, EXIF orientations 5–8 swap width/height.
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;

  await fs.mkdir(uploadDir, { recursive: true });
  const id = crypto.randomUUID();
  const storageKey = `${id}.${EXT[mime]}`;

  const encoders: Record<AllowedImageMime, (s: sharp.Sharp) => sharp.Sharp> = {
    'image/jpeg': (s) => s.jpeg({ quality: 88, mozjpeg: true }),
    'image/png': (s) => s.png({ compressionLevel: 9 }),
    'image/webp': (s) => s.webp({ quality: 86 }),
    'image/avif': (s) => s.avif({ quality: 60 }),
  };
  const original = await encoders[mime](image.clone()).toBuffer();
  await fs.writeFile(resolveStoragePath(uploadDir, storageKey), original);

  const variants: Array<{ storageKey: string; width: number; format: string; bytes: number }> = [];
  for (const w of IMAGE_VARIANT_WIDTHS) {
    if (w >= width && variants.length > 0) break;
    const targetWidth = Math.min(w, width);
    const key = `${id}-w${targetWidth}.webp`;
    const out = await image.clone().resize({ width: targetWidth, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    await fs.writeFile(resolveStoragePath(uploadDir, key), out);
    variants.push({ storageKey: key, width: targetWidth, format: 'webp', bytes: out.length });
    if (targetWidth === width) break;
  }

  return MediaAsset.create({
    storageKey,
    originalName: originalName.replace(/[^\w.\- ]/g, '').slice(0, 200),
    mimeType: mime,
    width,
    height,
    bytes: original.length,
    altText,
    variants,
    uploadedBy,
  });
}

export async function deleteImageFiles(uploadDir: string, asset: { storageKey: string; variants: Array<{ storageKey?: string | null }> }) {
  const keys = [asset.storageKey, ...asset.variants.map((v) => v.storageKey).filter((k): k is string => !!k)];
  await Promise.all(keys.map((k) => fs.rm(resolveStoragePath(uploadDir, k), { force: true })));
}

type AssetLike = {
  _id: unknown;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  altText?: string | null;
  bytes: number;
  createdAt: Date;
  variants: Array<{ storageKey?: string | null; width?: number | null; format?: string | null }>;
};

export function toPublicImage(asset: AssetLike | null | undefined): PublicImage | null {
  if (!asset) return null;
  return {
    url: mediaUrl(asset.storageKey),
    width: asset.width,
    height: asset.height,
    altText: asset.altText ?? '',
    variants: asset.variants
      .filter((v) => v.storageKey && v.width)
      .map((v) => ({ url: mediaUrl(v.storageKey!), width: v.width!, format: (v.format ?? 'webp') as 'webp' })),
  };
}

export function toMediaDTO(asset: AssetLike): MediaAssetDTO {
  const img = toPublicImage(asset)!;
  return { id: String(asset._id), ...img, mimeType: asset.mimeType, bytes: asset.bytes, createdAt: asset.createdAt.toISOString() };
}
