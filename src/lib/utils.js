import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

// Serve Base44-hosted photos at the size they actually render, as WebP, so no
// page downloads a full-resolution original. Photos already transformed, and
// every external URL (Square catalog, Printful, customer uploads), pass
// through untouched. mode 'fill' cover-crops to w×h (matches object-cover
// boxes); 'fit' contains inside w×h without cropping (for object-contain art
// and the gallery lightbox, where the whole photo must stay visible).
export function optimizedImageUrl(url, w, h, mode = 'fill') {
  if (!url) return url;
  // Already optimized copies (always served as WebP) and URLs that already
  // carry a transform are returned as-is, so nothing is transformed twice.
  if (/\.webp(\?|$)/i.test(url)) return url;
  const base44Hosted = url.includes('media.base44.com') || url.includes('/files/mp/public/');
  if (!base44Hosted || url.includes('/v1/')) return url;
  return `${url}/v1/${mode}/w_${w},h_${h}/file.webp`;
} 


export const isIframe = window.self !== window.top;