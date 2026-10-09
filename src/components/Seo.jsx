import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Lightweight per-page SEO: sets <title>, meta description, and optional
// Open Graph / Twitter Card share tags on mount so landing pages can target
// their own keywords and share previews without touching index.html. Only
// the props a page passes are applied; omitted props leave the index.html
// defaults untouched (so the homepage card stays for routes that don't override).
//
// `path` (optional): for keep-alive tab pages (Home, Menu, Merch, Account) that
// stay mounted across tab switches. Without this guard, a hidden tab's Seo
// would override the active page's meta tags. When `path` is provided, the
// effect only applies when the current route matches — so the active tab's
// Seo wins and hidden tabs stay quiet.
export default function Seo({ title, description, ogTitle, ogDescription, ogImage, ogImageAlt, path }) {
  const location = useLocation();
  useEffect(() => {
    if (path && location.pathname !== path) return;
    if (title) document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', ogTitle);
    setMeta('property', 'og:description', ogDescription);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:image:alt', ogImageAlt);
    setMeta('name', 'twitter:title', ogTitle);
    setMeta('name', 'twitter:description', ogDescription);
    setMeta('name', 'twitter:image', ogImage);
  }, [title, description, ogTitle, ogDescription, ogImage, ogImageAlt, path, location.pathname]);
  return null;
}

function setMeta(attr, key, content) {
  if (content == null || content === '') return;
  let meta = document.querySelector(`meta[${attr}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}