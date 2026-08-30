import React, { useState } from 'react';
import { Star, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Compact feedback card shown right after an order is confirmed. Saves into
// the same Review feed as the public feedback form, so approved submissions
// surface in the "What Our Neighbors Are Saying" testimonials section.
export default function PostOrderFeedback({ orderId }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (rating === 0) { setError('Please tap a star to give a rating.'); return; }
    if (!name.trim()) { setError('Add your name so we can credit your review.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        customer_name: name.trim(),
        rating,
        text: text.trim() || 'Great experience!',
        is_approved: false,
      };
      if (orderId) payload.order_id = orderId;
      await base44.entities.Review.create(payload);
      setSubmitted(true);
    } catch {
      setError('Could not submit your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-4 gap-2">
        <CheckCircle2 size={36} className="text-patina-mint" />
        <h3 className="font-heading text-xl text-obsidian-roast">Thanks for the love!</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Your review is in. Once our team approves it, it'll show up on the home page in "What Our Neighbors Are Saying."
        </p>
      </div>
    );
  }

  return (
    <div className="card-diner p-6 text-left">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
          <MessageSquare size={18} className="text-midnight-cherry" />
        </div>
        <div>
          <h3 className="font-heading text-lg text-obsidian-roast leading-none">How was it?</h3>
          <p className="text-xs text-muted-foreground mt-1">Rate your experience — it takes 10 seconds.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Your Rating *</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                className="tap-44"
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={26}
                  className={`transition-colors ${(hovered || rating) >= n ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Your Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Comments (optional)</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Tell us what you loved…"
            rows={3}
            className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry resize-none"
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-cherry chrome-hover w-full py-3.5 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}