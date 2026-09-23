import { useEffect } from 'react';

// Lightweight per-page SEO: sets <title>, meta description, and optional
// Open Graph / Twitter Card share tags on mount so landing pages can target
// their own keywords and share previews without touching index.html. Only
// the props a page passes are applied; omitted props leave the index.html
// defaults untouched (so the homepage card stays for routes that don't override).
export default function Seo({ title, description, ogTitle, ogDescription, ogImage, ogImageAlt }) {
  useEffect(() => {
    if (title) document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', ogTitle);
    setMeta('property', 'og:description', ogDescription);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:image:alt', ogImageAlt);
    setMeta('name', 'twitter:title', ogTitle);
    setMeta('name', 'twitter:description', ogDescription);
    setMeta('name', 'twitter:image', ogImage);
  }, [title, description, ogTitle, ogDescription, ogImage, ogImageAlt]);
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