// Embed photos before capture, so the canvas never depends on off-screen lazy
// loading, a second cross-origin image request, or a partially decoded image.
async function photoDataUrl(src, label) {
  if (src.startsWith('data:')) return src;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    // Preview <img> requests are not CORS requests. Do not reuse those cached
    // responses when fetching the same photo for an exportable canvas.
    const response = await fetch(src, { mode: 'cors', cache: 'reload', signal: controller.signal });
    if (!response.ok) throw new Error(`Photo request returned ${response.status}.`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('The photo link did not return an image.');
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('The photo could not be read.'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`Could not prepare ${label || 'an ad photo'} for the PDF. ${error.name === 'AbortError' ? 'The photo took too long to load.' : error.message}`);
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function embedAdPhotos(sheet) {
  const photos = new Map();
  await Promise.all(Array.from(sheet.querySelectorAll('img'), async (img) => {
    const src = img.src;
    if (!photos.has(src)) photos.set(src, photoDataUrl(src, img.alt));
    img.src = await photos.get(src);
  }));
}

export function offerAdPdf(blob, fileName, iosTab) {
  const url = URL.createObjectURL(blob);
  if (iosTab && !iosTab.closed) {
    iosTab.location.replace(url);
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  // Keep the URL alive for the visible Save PDF link and iOS's PDF viewer.
  return { url, fileName };
}