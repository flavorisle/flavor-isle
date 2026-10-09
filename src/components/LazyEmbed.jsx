// Lazy-loading embed wrapper for TikTok and Instagram content. Shows a
// lightweight placeholder card until the user clicks "Load Video" or the
// card scrolls into view, then injects the platform embed so the page
// doesn't inherit TikTok/Instagram script weight on first paint.
import React, { useState, useRef, useEffect } from 'react';
import { Play, ExternalLink } from 'lucide-react';

export default function LazyEmbed({ type, url, title, subtitle, creator }) {
  const [activated, setActivated] = useState(false);
  const ref = useRef(null);

  // Activate on scroll into view (once).
  useEffect(() => {
    if (activated) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setActivated(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activated]);

  // When a TikTok embed activates, (re)inject the embed.js script so it
  // processes the newly rendered blockquote. Already-processed blockquotes
  // are gone, so re-injecting only picks up the new ones — no flicker.
  useEffect(() => {
    if (!activated || type !== 'tiktok') return;
    const existing = document.querySelector('script[data-tiktok-embed]');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    script.setAttribute('data-tiktok-embed', 'true');
    document.body.appendChild(script);
  }, [activated, type]);

  // Placeholder card — no third-party scripts loaded yet.
  if (!activated) {
    const openUrl = type === 'instagram' ? url.replace('/embed', '') : url;
    return (
      <div ref={ref} className="card-diner p-6 flex flex-col items-center justify-center text-center min-h-[320px]">
        <button
          onClick={() => setActivated(true)}
          className="w-14 h-14 rounded-full bg-midnight-cherry/10 flex items-center justify-center mb-4 hover:bg-midnight-cherry/20 transition-colors"
          aria-label={`Load ${type} video`}
        >
          <Play size={24} className="text-midnight-cherry" />
        </button>
        {creator && (
          <p className="text-xs text-patina-mint font-heading uppercase tracking-wider mb-2">@{creator}</p>
        )}
        <p className="font-heading text-base text-obsidian-roast mb-1 max-w-xs leading-snug">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>}
        <button
          onClick={() => setActivated(true)}
          className="btn-cherry px-5 py-2 text-xs font-heading mt-2"
        >
          Load Video
        </button>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-muted-foreground hover:text-obsidian-roast inline-flex items-center gap-1"
        >
          <ExternalLink size={11} /> Open on {type === 'tiktok' ? 'TikTok' : type === 'instagram' ? 'Instagram' : 'Facebook'}
        </a>
      </div>
    );
  }

  // Activated — render the embed.
  if (type === 'tiktok') {
    const videoId = url.match(/\/video\/(\d+)/)?.[1];
    return (
      <div ref={ref} className="card-diner overflow-hidden flex justify-center">
        <blockquote
          className="tiktok-embed"
          cite={url}
          data-video-id={videoId}
          style={{ maxWidth: '380px', minWidth: '280px', margin: 0 }}
        >
          <a href={url} target="_blank" rel="noopener noreferrer">Watch on TikTok</a>
        </blockquote>
      </div>
    );
  }

  if (type === 'instagram') {
    return (
      <div ref={ref} className="card-diner overflow-hidden">
        <iframe
          src={url}
          width="100%"
          height="580"
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          title={title}
          style={{ border: 'none', borderRadius: '0.75rem' }}
        />
      </div>
    );
  }

  if (type === 'facebook') {
    const pluginUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=true`;
    return (
      <div ref={ref} className="card-diner overflow-hidden">
        <iframe
          src={pluginUrl}
          width="100%"
          height="580"
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          title={title}
          style={{ border: 'none', borderRadius: '0.75rem' }}
        />
      </div>
    );
  }

  return null;
}