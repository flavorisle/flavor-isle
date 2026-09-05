import React, { useState, useEffect, useCallback } from 'react';
import { Star, Check, CheckCircle2, Trash2, Loader2, MessageSquareQuote, Filter, Inbox, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';

const FILTERS = [
  { id: 'pending', label: 'Pending', Icon: Inbox },
  { id: 'approved', label: 'Approved', Icon: CheckCheck },
  { id: 'all', label: 'All', Icon: Filter },
];

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Review.list('-created_date', 200);
      setReviews(all || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = reviews.filter(r => {
    if (filter === 'pending') return !r.is_approved;
    if (filter === 'approved') return r.is_approved;
    return true;
  });

  const counts = {
    pending: reviews.filter(r => !r.is_approved).length,
    approved: reviews.filter(r => r.is_approved).length,
    all: reviews.length,
  };

  const toggleApprove = async (r) => {
    setBusyId(r.id);
    try {
      await base44.entities.Review.update(r.id, { is_approved: !r.is_approved });
      setReviews(prev => prev.map(x => x.id === r.id ? { ...x, is_approved: !x.is_approved } : x));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r) => {
    if (!window.confirm('Delete this review permanently?')) return;
    setBusyId(r.id);
    try {
      await base44.entities.Review.delete(r.id);
      setReviews(prev => prev.filter(x => x.id !== r.id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <AdminNav />

      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquareQuote size={24} className="text-[hsl(var(--primary))]" />
            <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">CUSTOMER FEEDBACK</p>
          </div>
          <h1 className="font-heading text-4xl text-white">Reviews & Testimonials</h1>
          <p className="text-gray-300 mt-3 max-w-2xl">
            Every review customers submit after their order lands here. Approve the best ones to feature them in "What Our Neighbors Are Saying" on the home page.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {FILTERS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading whitespace-nowrap transition-all ${
                filter === id ? 'bg-midnight-cherry text-white' : 'bg-white text-obsidian-roast hover:bg-muted'
              }`}
            >
              <Icon size={14} /> {label}
              <span className={`ml-1 text-xs ${filter === id ? 'text-white/80' : 'text-muted-foreground'}`}>{counts[id]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-midnight-cherry" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-diner p-12 text-center">
            <Inbox size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="font-heading text-lg text-obsidian-roast">No {filter === 'pending' ? 'pending' : filter === 'approved' ? 'approved' : ''} reviews</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'pending' ? "You're all caught up — no reviews waiting for approval." : 'Reviews will appear here once customers submit them.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(r => (
              <div key={r.id} className={`card-diner p-5 ${r.is_approved ? 'ring-1 ring-patina-mint/30' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex gap-0.5 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={14} className={n <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading text-sm text-obsidian-roast truncate">{r.customer_name || 'Anonymous'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.customer_email || 'No email'}
                        {r.order_id ? ` · Order ${r.order_id}` : ''}
                        {r.menu_item_name ? ` · ${r.menu_item_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-heading px-2.5 py-1 rounded-full flex-shrink-0 ${
                    r.is_approved ? 'bg-patina-mint/15 text-patina-mint' : 'bg-smashie-yellow/20 text-obsidian-roast'
                  }`}>
                    {r.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-3">"{r.text}"</p>

                {r.photo_url && (
                  <div className="w-full max-w-xs h-40 rounded-2xl overflow-hidden mb-3">
                    <img src={r.photo_url} alt="Customer photo" className="w-full h-full object-cover" />
                  </div>
                )}

                <p className="text-xs text-muted-foreground mb-4">
                  {new Date(r.created_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleApprove(r)}
                    disabled={busyId === r.id}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-heading transition-colors disabled:opacity-60 ${
                      r.is_approved ? 'bg-muted text-obsidian-roast hover:bg-gray-200' : 'bg-patina-mint text-white hover:opacity-90'
                    }`}
                  >
                    {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : r.is_approved ? <Check size={14} /> : <CheckCircle2 size={14} />}
                    {r.is_approved ? 'Unapprove' : 'Approve'}
                  </button>
                  <button
                    onClick={() => remove(r)}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-heading bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-60"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}