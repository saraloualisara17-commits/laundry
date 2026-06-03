/**
 * Normalises an arbitrary image reference (full URL, leading-slash path, or
 * bare filename) into a path under /uploads/.
 *
 * The backend may return either:
 *   - the full path:                "2026/06/uuid.webp"
 *   - just the filename:            "uuid.webp"
 *   - an absolute URL:              "https://cdn.example.com/uuid.webp"
 *
 * Returns null for empty input.
 *
 * Used by the public catalog screens for category and product images.
 */
export function uploadsImgSrc(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const clean = url.replace(/^\/+/, '').replace(/^uploads\//, '');
  return `/uploads/${clean}`;
}
