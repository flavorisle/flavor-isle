import React, { useState } from 'react';
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
          className="tap-44"
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

export default function ReviewForm({ onSuccess, submitLabel = 'Submit Feedback', menuItem = null, orderId = null }) {
  const [form, setForm] = useState({ customer_name: '', customer_email: '', rating: 0, text: '', photo_url: '' });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
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
      setError('Please fill in your name, your comments, and a rating.');
      return;
    }
    setSubmitting(true);
    try {
      // Creates a Review pending approval — once an admin approves it, it
      // shows up on the home page in "What Our Neighbors Are Saying". When
      // menuItem is provided, the review is linked to that food item so it
      // also surfaces on the menu card.
      const payload = { ...form, is_approved: false };
      if (menuItem?.id) {
        payload.menu_item_id = menuItem.id;
        payload.menu_item_name = menuItem.name;
      }
      if (orderId) {
        payload.order_id = orderId;
      }
      await base44.entities.Review.create(payload);
      setSubmitted(true);
      onSuccess?.();
    } catch {
      setError('Could not submit your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-6 gap-3">
        <CheckCircle size={40} className="text-patina-mint" />
        <h4 className="font-heading text-xl text-obsidian-roast">Thank you!</h4>
        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
          Your feedback is in. Once our team approves it, it'll appear on the home page in "What Our Neighbors Are Saying."
        </p>
      </div>
    );
  }

  return (
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
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Your Comments *</label>
        <textarea
          value={form.text}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          placeholder="Tell us about your visit — what you loved, or anything we could do better…"
          rows={5}
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
        disabled={submitting}
        className="btn-cherry chrome-hover w-full py-4 text-sm font-heading disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : submitLabel}
      </button>
    </form>
  );
}