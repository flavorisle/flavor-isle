// Menu photo optimization (issue #33, phase 2).
//
// Takes a Square catalog photo URL and produces a small WebP copy of it:
// resized to at most MAX_EDGE on the longest edge (never upscaled), converted
// to WebP, and stored in the app's public media library. The Square original
// is never modified and stays exactly where it is — this only adds a
// right-sized derivative that the site then serves.
//
// The resize + WebP encoding runs on the platform's own image service (the
// same /v1/fit transform used for site photos), so no native image library is
// needed and small photos are never enlarged.
//
// Throws on failure so callers can log the item, skip it, and retry later.

const MAX_EDGE = 800;

function safeName(label) {
  return String(label || 'menu-item')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'menu-item';
}

// Intrinsic pixel size, read straight from the file header (PNG IHDR / JPEG
// SOF) so the derivative is capped at the original size.
function naturalSize(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20), type: 'image/png' };
  }
  for (let i = 2; i < bytes.length - 9;) {
    if (bytes[i] !== 0xff) { i += 1; continue; }
    const marker = bytes[i + 1];
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width, height, type: 'image/jpeg' };
    }
    i += 2 + length;
  }
  return null;
}

export async function optimizeItemImage(base44, imageUrl, label = 'menu-item') {
  if (!imageUrl) return null;

  const download = await fetch(imageUrl);
  if (!download.ok) throw new Error(`download failed (${download.status})`);
  const original = new Uint8Array(await download.arrayBuffer());

  const size = naturalSize(original);
  if (!size || !size.width || !size.height) throw new Error('unsupported image format');

  const longest = Math.max(size.width, size.height);
  const scale = Math.min(1, MAX_EDGE / longest);
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));

  const source = await base44.asServiceRole.integrations.Core.UploadPublicFile({
    file: new File([original], `${safeName(label)}-source-${Date.now()}`, { type: size.type }),
  });
  if (!source?.file_url) throw new Error('source upload returned no url');

  const resized = await fetch(`${source.file_url}/v1/fit/w_${width},h_${height}/file.webp`);
  if (!resized.ok) throw new Error(`resize failed (${resized.status})`);
  const webp = new Uint8Array(await resized.arrayBuffer());
  if (!webp.length) throw new Error('resize returned no bytes');

  const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({
    file: new File([webp], `${safeName(label)}-${width}x${height}.webp`, { type: 'image/webp' }),
  });
  if (!file_url) throw new Error('upload returned no url');

  return file_url;
}