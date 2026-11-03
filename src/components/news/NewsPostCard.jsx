import React from 'react';
import { CalendarDays, Store, Handshake } from 'lucide-react';
import StopsShopsHeader from '@/components/news/StopsShopsHeader';
import NewsMedia from '@/components/news/NewsMedia';

const CATEGORY_META = {
  community_event: { label: 'Community Event', Icon: CalendarDays, bg: 'bg-smashie-yellow', text: 'text-obsidian-roast' },
  isle_update: { label: 'Isle Update', Icon: Store, bg: 'bg-midnight-cherry', text: 'text-white' },
  diner_update: { label: 'Isle Update', Icon: Store, bg: 'bg-midnight-cherry', text: 'text-white' },
  local_partnership: { label: 'Local Partnership', Icon: Handshake, bg: 'bg-patina-mint', text: 'text-white' },
};

export default function NewsPostCard({ post }) {
  const meta = CATEGORY_META[post.category] || CATEGORY_META.isle_update;
  const { Icon } = meta;
  const date = new Date(post.post_date || post.created_date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const media = post.media || [];
  const top = media.find((m) => m.placement === 'top');
  const middle = media.find((m) => m.placement === 'middle');
  const bottom = media.find((m) => m.placement === 'bottom');

  const paragraphs = (post.body || '').split(/\n{2,}/).filter(Boolean);
  const middleAfter = Math.ceil(paragraphs.length / 2) - 1;

  return (
    <article className="card-diner overflow-hidden">
      {post.map_header && (
        <div className="bg-vanilla-malt border-b border-border px-5 sm:px-6 pt-5 pb-4">
          <StopsShopsHeader />
        </div>
      )}
      {top && (
        <div className="px-5 sm:px-6 pt-5">
          <NewsMedia media={top} />
        </div>
      )}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-heading tracking-widest uppercase ${meta.bg} ${meta.text}`}>
            <Icon size={12} /> {meta.label}
          </span>
          <span className="text-xs text-muted-foreground font-body">{date}</span>
        </div>
        <h2 className="font-heading text-xl sm:text-2xl text-obsidian-roast leading-tight mb-2">{post.title}</h2>
        <div className="space-y-3">
          {paragraphs.map((paragraph, i) => (
            <React.Fragment key={i}>
              <p className="font-body text-sm sm:text-base text-obsidian-roast leading-relaxed whitespace-pre-line">{paragraph}</p>
              {middle && i === middleAfter && <NewsMedia media={middle} />}
            </React.Fragment>
          ))}
          {middle && paragraphs.length === 0 && <NewsMedia media={middle} />}
        </div>
        {post.image_url && (
          <img src={post.image_url} alt={post.title} className="w-full h-auto rounded-xl mt-4 block" loading="lazy" />
        )}
        {bottom && <NewsMedia media={bottom} className="mt-4" />}
      </div>
    </article>
  );
}