import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CATEGORIES = [
  { value: 'community_event', label: 'Community Event' },
  { value: 'diner_update', label: 'Diner Update' },
  { value: 'local_partnership', label: 'Local Partnership' },
];

// Admin-only quick composer for posting news to the community page.
export default function NewsComposer({ onPosted }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('diner_update');
  const [saving, setSaving] = useState(false);

  const inputCls =
    'w-full px-4 py-3 border border-border rounded-2xl bg-white font-body text-obsidian-roast focus:outline-none focus:border-midnight-cherry transition-all';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    await base44.entities.NewsPost.create({ title: title.trim(), body: body.trim(), category, is_published: true });
    setTitle('');
    setBody('');
    setSaving(false);
    setOpen(false);
    onPosted?.();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-mint chrome-hover px-6 py-3 text-sm inline-flex items-center gap-2">
        <Plus size={16} /> Post an Announcement
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-diner p-5 text-left space-y-3 max-w-xl mx-auto">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline" required className={inputCls} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What's the news?" rows={4} required className={inputCls} />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-cherry px-6 py-2.5 text-sm disabled:opacity-60">
          {saving ? 'Posting…' : 'Publish'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-6 py-2.5 text-sm font-heading rounded-full border-2 border-border text-obsidian-roast">
          Cancel
        </button>
      </div>
    </form>
  );
}