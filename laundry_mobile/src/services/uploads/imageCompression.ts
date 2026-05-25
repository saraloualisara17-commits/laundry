import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../../lib/logger';

const log = logger.ns('compress');

// ─── Profiles ────────────────────────────────────────────────────────────────
// Different use-cases need different quality/size trade-offs.
// thumbnail: tiny preview grid images shown in list screens
// standard:  order/item photos — good quality, still small enough to upload fast
// full:      proof-of-delivery or high-value documentation photos

export type CompressionProfile = 'thumbnail' | 'standard' | 'full';

const PROFILES: Record<CompressionProfile, { maxWidth: number; quality: number }> = {
  thumbnail: { maxWidth: 400,  quality: 0.55 },
  standard:  { maxWidth: 1080, quality: 0.72 },
  full:      { maxWidth: 1600, quality: 0.82 },
};

// Source files larger than this get compressed regardless of profile
const ALWAYS_COMPRESS_ABOVE_BYTES = 300 * 1024; // 300 KB

// ─── Core ─────────────────────────────────────────────────────────────────────

export async function compressImage(
  uri: string,
  profile: CompressionProfile = 'standard',
): Promise<string> {
  // Skip compression for remote URLs — they're already on the server
  if (!uri.startsWith('file://') && !uri.startsWith('content://')) return uri;

  const { maxWidth, quality } = PROFILES[profile];

  try {
    // Check if the file is small enough to skip compression entirely.
    // Skipping saves ~300-800ms of JS-thread work per image.
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    const bytes = (info as any).size ?? Infinity;
    if (bytes < ALWAYS_COMPRESS_ABOVE_BYTES) {
      log.debug('Skipping compression — file already small', { bytes });
      return uri;
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        // base64 is NOT requested — we only need the file URI
      },
    );

    const afterInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
    log.debug('Compressed', {
      before: `${Math.round(bytes / 1024)}KB`,
      after: `${Math.round(((afterInfo as any).size ?? 0) / 1024)}KB`,
      profile,
    });

    return result.uri;
  } catch (err) {
    log.error('Compression failed — using original', { err: String(err) });
    return uri; // graceful degradation
  }
}

// Parallel compression — all images run at the same time
export async function compressImages(
  uris: string[],
  profile: CompressionProfile = 'standard',
): Promise<string[]> {
  return Promise.all(uris.map(uri => compressImage(uri, profile)));
}
