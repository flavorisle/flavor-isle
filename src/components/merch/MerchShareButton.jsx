// Share button for Tasty Threads products — native share sheet on mobile,
// copy-link fallback on desktop.
import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export default function MerchShareButton({ product }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/merch?product=${product.id}`;

  const handleShare = async () => {
    const shareData = {
      title: `${product.name} — Tasty Threads`,
      text: `Check out ${product.name} from Flavor Isle's Tasty Threads!`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      aria-label="Share this product"
      className="tap-44 flex items-center justify-center hover:bg-muted rounded-full transition-colors flex-shrink-0"
    >
      {copied ? <Check size={18} className="text-patina-mint" /> : <Share2 size={18} className="text-obsidian-roast" />}
    </button>
  );
}