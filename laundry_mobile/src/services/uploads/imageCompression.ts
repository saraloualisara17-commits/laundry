import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';
import { logger } from '../../lib/logger';

const log = logger.ns('compress');

export type CompressionProfile = 'thumbnail' | 'standard' | 'full';

// ─── Profiles ────────────────────────────────────────────────────────────────
// maxWidth:  longest side in pixels — aspect ratio is always preserved
// quality:   0–1 JPEG/WebP encoder quality
// skipBytes: skip compression if file is already below this size AND fits
//            within maxWidth — avoids 300–800ms JS-thread work for tiny files

const PROFILES: Record<CompressionProfile, { maxWidth: number; quality: number; skipBytes: number }> = {
  thumbnail: { maxWidth: 400,  quality: 0.60, skipBytes:  80 * 1024 },  // 80 KB
  standard:  { maxWidth: 1080, quality: 0.75, skipBytes: 150 * 1024 },  // 150 KB
  full:      { maxWidth: 1600, quality: 0.82, skipBytes: 300 * 1024 },  // 300 KB
};

// expo-image-manipulator supports WebP encoding on both Android and iOS from SDK 51+.
// This project targets Expo SDK 54, so WebP is safe on all platforms.
const PREFERRED_FORMAT = ImageManipulator.SaveFormat.WEBP;

// ─── Dimension helper ────────────────────────────────────────────────────────

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err),
    );
  });
}

// ─── Core ────────────────────────────────────────────────────────────────────

export async function compressImage(
  uri: string,
  profile: CompressionProfile = 'standard',
): Promise<string> {
  // Remote URLs are already on the server — never re-compress
  if (!uri.startsWith('file://') && !uri.startsWith('content://')) return uri;

  const { maxWidth, quality, skipBytes } = PROFILES[profile];

  try {
    // Read file size and pixel dimensions in parallel — both are cheap I/O
    const [info, dimensions] = await Promise.all([
      FileSystem.getInfoAsync(uri, { size: true }),
      getImageDimensions(uri).catch(() => null),
    ]);

    const bytes = (info as any).size ?? Infinity;
    const imgWidth = dimensions?.width ?? Infinity;

    // Skip compression only when BOTH conditions are met:
    //   1. File is already below the profile's size threshold
    //   2. Image dimensions are already within the profile's max width
    // A 290 KB 4032-pixel photo still needs resizing even though it's "small".
    if (bytes < skipBytes && imgWidth <= maxWidth) {
      log.debug('Skipping — already fits profile', { bytes, imgWidth, profile });
      return uri;
    }

    // Only add a resize action if the image is actually wider than the target.
    // Upscaling small images wastes space and degrades quality.
    const actions: ImageManipulator.Action[] =
      imgWidth > maxWidth ? [{ resize: { width: maxWidth } }] : [];

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: quality,
      format: PREFERRED_FORMAT,
    });

    if (__DEV__) {
      const afterInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
      log.debug('Compressed', {
        before: `${Math.round(bytes / 1024)}KB @ ${imgWidth}px`,
        after:  `${Math.round(((afterInfo as any).size ?? 0) / 1024)}KB`,
        format: PREFERRED_FORMAT,
        profile,
      });
    }

    return result.uri;

  } catch (err) {
    // First failure: retry at lower quality before giving up.
    // A compression crash is rare (memory pressure, corrupt EXIF) but when it
    // happens we still want to upload something rather than silently drop.
    log.warn('Compression failed — retrying at reduced quality', { err: String(err), profile });
    try {
      const fallbackQuality = quality - 0.15;
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: Math.min(maxWidth, 800) } }],
        { compress: Math.max(0.4, fallbackQuality), format: PREFERRED_FORMAT },
      );
      log.info('Fallback compression succeeded');
      return result.uri;
    } catch (fallbackErr) {
      // Both attempts failed — return original rather than dropping the photo
      log.error('Fallback compression also failed — using original', { err: String(fallbackErr) });
      return uri;
    }
  }
}

// Parallel compression — all images run simultaneously on the JS thread.
// Do not serialize: a 4-image batch compresses in ~max(t) not ~sum(t).
export async function compressImages(
  uris: string[],
  profile: CompressionProfile = 'standard',
): Promise<string[]> {
  return Promise.all(uris.map(uri => compressImage(uri, profile)));
}
