import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SocialPostPreview from '@/components/marketing/SocialPostPreview';
import SocialPostCard from '@/components/marketing/SocialPostCard';
import { SOCIAL_POSTS } from '@/lib/socialPosts';

export default function FacebookAd() {
  const [activeId, setActiveId] = useState(SOCIAL_POSTS[0].id);
  const post = SOCIAL_POSTS.find((item) => item.id === activeId) || SOCIAL_POSTS[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Marketing Toolkit</p>
          <h1 className="font-heading text-4xl text-obsidian-roast mb-3">Social Posts — Flavor Isle</h1>
          <p className="font-body text-muted-foreground max-w-xl mx-auto">
            Ready-to-paste posts for Facebook, Instagram and TikTok. Every post uses a real photo from the gallery
            and only facts about the Isle.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {SOCIAL_POSTS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              className={`px-5 py-2.5 rounded-full font-heading text-sm tracking-wider transition-colors ${
                item.id === activeId
                  ? 'bg-midnight-cherry text-white shadow-float'
                  : 'bg-white text-obsidian-roast hover:bg-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3">Post Preview</p>
            <SocialPostPreview post={post} />
          </div>
          <SocialPostCard post={post} />
        </div>
      </div>

      <Footer />
    </div>
  );
}