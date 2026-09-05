import React from 'react';
import { CalendarDays, Store, Handshake } from 'lucide-react';

const CATEGORY_META = {
  community_event: { label: 'Community Event', Icon: CalendarDays, bg: 'bg-smashie-yellow', text: 'text-obsidian-roast' },
  diner_update: { label: 'Diner Update', Icon: Store, bg: 'bg-midnight-cherry', text: 'text-white' },
  local_partnership: { label: 'Local Partnership', Icon: Handshake, bg: 'bg-patina-mint', text: 'text-white' },
};

export default function NewsPostCard({ post }) {
  const meta = CATEGORY_META[post.category] || CATEGORY_META.diner_update;
  const { Icon } = meta;
  const date = new Date(post.created_date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <article className="card-diner overflow-hidden">
      {post.image_url && (
        <img src={post.image_url} alt={post.title} className="w-full h-48 object-cover" loading="lazy" />
      )}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-heading tracking-widest uppercase ${meta.bg} ${meta.text}`}>
            <Icon size={12} /> {meta.label}
          </span>
          <span className="text-xs text-muted-foreground font-body">{date}</span>
        </div>
        <h2 className="font-heading text-xl sm:text-2xl text-obsidian-roast leading-tight mb-2">{post.title}</h2>
        <p className="font-body text-sm sm:text-base text-obsidian-roast/85 leading-relaxed whitespace-pre-line">{post.body}</p>
      </div>
    </article>
  );
}