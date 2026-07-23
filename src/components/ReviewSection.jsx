import React, { useState, useEffect } from 'react';
import { Star, Camera, X, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        >
          <Star
            size={28}
            className={`transition-colors ${(hovered || value) >= n ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="card-diner p-6 flex flex-col gap-3">
      {review.photo_url && (
        <div className="w-full h-40 rounded-2xl overflow-hidden">
          <img src={review.photo_url} alt="Visit photo" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
        ))}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">"{review.text}"</p>
      <p className="font-heading text-sm text-obsidian-roast">— {review.customer_name}</p>
    </div>
  );
}

export default function ReviewSection() {
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ customer_name: '', customer_email: '', rating: 0, text: '', photo_url: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.Review.filter({ is_approved: true })
      .then(data => setReviews(data || []))
      .catch(() => {});
  }, []);

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, photo_url: file_url }));
    } catch {
      setError('Photo upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.customer_name.trim() || !form.text.trim() || form.rating === 0) {
      setError('Please fill in your name, review, and rating.');
      return;
    }
    try {
      await base44.entities.Review.create({ ...form, is_approved: false });
      setSubmitted(true);
      setShowForm(false);
    } catch {
      setError('Could not submit review. Please try again.');
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
          <div>
            <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Smiths Grove Loves Flavor Isle</p>
            <h2 className="font-heading text-4xl text-obsidian-roast">What Our Neighbors Are Saying</h2>
          </div>
          {!submitted ? (
            <button
              onClick={() => setShowForm(true)}
              className="btn-cherry chrome-hover px-6 py-3 text-sm flex items-center gap-2 flex-shrink-0"
            >
              <Camera size={16} /> Share Your Experience
            </button>
          ) : (
            <div className="flex items-center gap-2 text-patina-mint font-semibold text-sm">
              <CheckCircle size={18} /> Thanks for your review!
            </div>
          )}
        </div>

        {/* Review Grid */}
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { customer_name: 'Sarah M.', text: 'Best burger in Smiths Grove — hands down. The smash burger is everything!', rating: 5 },
              { customer_name: 'James T.', text: 'The milkshakes are thick and creamy. My kids beg to come here every weekend.', rating: 5 },
              { customer_name: 'Linda K.', text: 'Classic diner vibes with amazing food. The all-day breakfast is a must!', rating: 5 },
            ].map(r => <ReviewCard key={r.customer_name} review={r} />)}
          </div>
        )}

        {/* Submit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-float-lg w-full max-w-lg p-8 relative">
              <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors">
                <X size={20} />
              </button>
              <h3 className="font-heading text-2xl text-obsidian-roast mb-1">Share Your Visit</h3>
              <p className="text-muted-foreground text-sm mb-6">Your review will appear after approval.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Your Name *</label>
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={form.customer_email}
                      onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                      placeholder="jane@example.com"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Rating *</label>
                  <StarPicker value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Your Review *</label>
                  <textarea
                    value={form.text}
                    onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                    placeholder="Tell us about your experience…"
                    rows={4}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Photo from your visit</label>
                  {form.photo_url ? (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden">
                      <img src={form.photo_url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, photo_url: '' }))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-2xl text-sm text-muted-foreground cursor-pointer hover:border-midnight-cherry/40 transition-colors ${uploading ? 'opacity-60' : ''}`}>
                      <Camera size={16} />
                      {uploading ? 'Uploading…' : 'Add a photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
                    </label>
                  )}
                </div>

                {error && <p className="text-destructive text-sm">{error}</p>}

                <button
                  type="submit"
                  className="btn-cherry chrome-hover w-full py-4 text-sm font-heading"
                >
                  Submit Review
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}