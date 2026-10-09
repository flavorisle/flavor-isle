import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

// Share action for a menu item. Defaults to the permanent direct URL
// (/menu?item=<stable id>) keyed by the item's stable id so it keeps working if
// the item's name or category changes, uses the native share sheet when
// available, and falls back to copy-to-clipboard with visible feedback. The
// product page passes its own name-based URL via `url` instead.
export default function ShareItemButton({ itemId, url: sharedUrl, variant = 'icon', className = '', ariaLabel }) {
  const [copied, setCopied] = useState(false);
  if (!itemId) return null;

  const url = sharedUrl || `${window.location.origin}/menu?item=${itemId}`;

  const handleShare = async (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    // Native share sheet (mobile + supporting desktop browsers).
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Flavor Isle menu',
          text: 'Check out this item on the Flavor Isle menu',
          url,
        });
        return;
      }
    } catch (err) {
      // User cancelled the share sheet — no fallback action needed.
      if (err?.name === 'AbortError') return;
    }
    // Copy-link fallback.
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={ariaLabel || 'Share this item'}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-heading text-sm transition-colors tap-44 ${
          copied ? 'bg-patina-mint text-white' : 'bg-muted text-obsidian-roast hover:bg-midnight-cherry hover:text-white'
        } ${className}`}
      >
        {copied ? <Check size={16} /> : <Share2 size={16} />}
        {copied ? 'Link Copied' : 'Share'}
      </button>
    );
  }

  // icon variant — for item cards.
  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={ariaLabel || 'Share this item'}
      title="Share this item"
      className={`p-2 rounded-full bg-white/90 hover:bg-white transition-colors tap-44 ${className}`}
    >
      {copied ? <Check size={18} className="text-patina-mint" /> : <Share2 size={18} className="text-gray-500" />}
    </button>
  );
}