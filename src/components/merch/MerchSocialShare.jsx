// Compact social share row for Tasty Threads products — post to Facebook or X,
// or copy the product's direct link.
import React, { useState } from 'react';
import { Facebook, Twitter, Link2, Check } from 'lucide-react';

export default function MerchSocialShare({ product }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/merch?product=${product.id}`;
  const text = `Check out ${product.name} from Flavor Isle's Tasty Threads!`;

  const open = (shareUrl) => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const networks = [
    {
      label: 'Share on Facebook',
      icon: Facebook,
      onClick: () => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`),
    },
    {
      label: 'Share on X',
      icon: Twitter,
      onClick: () => open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`),
    },
    {
      label: copied ? 'Link copied' : 'Copy link',
      icon: copied ? Check : Link2,
      onClick: async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
    },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {networks.map(({ label, icon: Icon, onClick }) => (
        <span
          key={label}
          role="button"
          tabIndex={0}
          aria-label={label}
          title={label}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick(); } }}
          className="w-8 h-8 rounded-full bg-muted hover:bg-midnight-cherry hover:text-white text-obsidian-roast flex items-center justify-center transition-colors cursor-pointer"
        >
          <Icon size={14} />
        </span>
      ))}
    </div>
  );
}