import React from 'react';
import { MapPin, ThumbsUp, MessageCircle, Share, Heart, Music2 } from 'lucide-react';
import { optimizedImageUrl } from '@/lib/utils';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

// Mocked platform post card so the crew can see the post before it goes live.
export default function SocialPostPreview({ post }) {
  const isVertical = post.id === 'tiktok';
  return (
    <div className="bg-white rounded-2xl shadow-float overflow-hidden max-w-md mx-auto">
      <div className="flex items-center gap-3 p-4">
        <img
          src={optimizedImageUrl(LOGO, 200, 200, 'fit')}
          alt="Flavor Isle"
          width="200"
          height="200"
          className="w-12 h-12 rounded-full object-contain bg-vanilla-malt flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="font-heading text-sm text-obsidian-roast leading-tight">{post.handle}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin size={10} />Smiths Grove, KY · Just now
          </p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="font-body text-sm text-obsidian-roast whitespace-pre-line leading-relaxed">{post.caption}</p>
        {post.hashtags && <p className="text-sm text-patina-mint leading-relaxed mt-1">{post.hashtags}</p>}
      </div>

      <div className={`w-full bg-muted ${isVertical ? 'aspect-[9/16]' : 'aspect-square'}`}>
        {post.image && (
          <img
            src={optimizedImageUrl(post.image, 800, isVertical ? 1400 : 800)}
            alt={post.imageCaption}
            width="800"
            height={isVertical ? '1400' : '800'}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="flex items-center justify-around px-4 py-2 border-t border-border text-xs text-muted-foreground">
        {post.id === 'instagram' ? (
          <>
            <span className="flex items-center gap-1.5"><Heart size={14} /> Like</span>
            <span className="flex items-center gap-1.5"><MessageCircle size={14} /> Comment</span>
            <span className="flex items-center gap-1.5"><Share size={14} /> Share</span>
          </>
        ) : post.id === 'tiktok' ? (
          <>
            <span className="flex items-center gap-1.5"><Heart size={14} /> Like</span>
            <span className="flex items-center gap-1.5"><MessageCircle size={14} /> Comment</span>
            <span className="flex items-center gap-1.5"><Music2 size={14} /> Sound</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5"><ThumbsUp size={14} /> Like</span>
            <span className="flex items-center gap-1.5"><MessageCircle size={14} /> Comment</span>
            <span className="flex items-center gap-1.5"><Share size={14} /> Share</span>
          </>
        )}
      </div>
    </div>
  );
}