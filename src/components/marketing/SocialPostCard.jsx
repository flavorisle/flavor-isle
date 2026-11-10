import React from 'react';
import CopyTextButton from '@/components/marketing/CopyTextButton';
import { optimizedImageUrl } from '@/lib/utils';

// Copy-ready caption, source photo and posting notes for one platform.
export default function SocialPostCard({ post }) {
  const fullCaption = post.hashtags ? `${post.caption}\n\n${post.hashtags}` : post.caption;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-float p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">{post.platform} Caption</p>
          <CopyTextButton text={fullCaption} label="Copy" />
        </div>
        <p className="font-body text-sm text-obsidian-roast whitespace-pre-line leading-relaxed bg-vanilla-malt rounded-xl p-3">
          {post.caption}
        </p>
        {post.hashtags && (
          <p className="text-sm text-patina-mint leading-relaxed bg-vanilla-malt rounded-xl p-3 mt-2">{post.hashtags}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">{post.target}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-float p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">Photo — {post.imageCaption}</p>
          <a
            href={post.image}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-heading uppercase tracking-widest text-patina-mint hover:underline"
          >
            Open
          </a>
        </div>
        <img
          src={optimizedImageUrl(post.image, 800, 800)}
          alt={post.imageCaption}
          width="800"
          height="800"
          loading="lazy"
          decoding="async"
          className="w-full aspect-square object-cover rounded-xl"
        />
        <p className="text-xs text-muted-foreground mt-2">{post.format} Straight from the gallery — no other image to use.</p>
      </div>

      <div className="bg-patina-mint/10 rounded-2xl p-5 border border-patina-mint/20">
        <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-2">Posting Tips</p>
        <ul className="text-sm text-obsidian-roast space-y-1.5 leading-relaxed">
          {post.tips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}