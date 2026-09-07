import React, { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import NewsPostCard from '@/components/news/NewsPostCard';
import NewsComposer from '@/components/news/NewsComposer';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function CommunityNews() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  const loadPosts = async () => {
    const all = await base44.entities.NewsPost.filter({ is_published: true }, '-created_date', 50);
    setPosts(all || []);
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Navbar />

      <section className="px-4 sm:px-6 pt-8 pb-6 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading tracking-widest uppercase text-white mb-3 bg-midnight-cherry">
          <Newspaper size={13} /> Community News
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">
          WHAT'S HAPPENING AT THE ISLE
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-body mt-3 max-w-xl mx-auto">
          Community events, diner updates, and local partnerships — straight from Smiths Grove.
        </p>
        {isAdmin && (
          <div className="mt-5">
            <NewsComposer onPosted={loadPosts} />
          </div>
        )}
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16 space-y-5">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
          </div>
        ) : posts.length === 0 ? (
          <div className="card-diner p-8 text-center">
            <p className="font-heading text-lg text-obsidian-roast mb-1">Nothing posted yet</p>
            <p className="text-sm text-muted-foreground font-body">Check back soon — news from the diner lands here first.</p>
          </div>
        ) : (
          posts.map((post) => <NewsPostCard key={post.id} post={post} />)
        )}
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}