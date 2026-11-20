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
  // URLs that already carry a transform are returned as-is, so nothing is
  // transformed twice. A .webp ORIGINAL (the menu's image_url_opt files) still
  // needs the transform: serving it untouched sent 800 px files into 56 px
  // boxes, about 1.3 MB of the home page.
  if (url.includes('/v1/')) return url;
  const base44Hosted = url.includes('media.base44.com') || url.includes('/files/mp/public/');
  if (!base44Hosted) return url;
  return `${url}/v1/${mode}/w_${w},h_${h}/file.webp`;
}


export const isIframe = window.self !== window.top;