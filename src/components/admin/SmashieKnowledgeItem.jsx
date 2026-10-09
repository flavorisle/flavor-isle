import React from 'react';

export default function SmashieKnowledgeItem({ topic, onChange, onDelete }) {
  return <div className="p-4 rounded-xl border border-border space-y-3">
    <div className="flex gap-2 items-center">
      <input aria-label="Topic title" value={topic.title || ''} maxLength={80} onChange={e => onChange({ ...topic, title: e.target.value })}
        placeholder="Topic title" className="flex-1 min-w-0 p-3 rounded-lg border border-border bg-background" />
      <button type="button" role="switch" aria-label={`${topic.title || 'Topic'} enabled`} aria-checked={topic.enabled !== false}
        onClick={() => onChange({ ...topic, enabled: topic.enabled === false })}
        className={`min-w-12 min-h-11 rounded-full px-1 flex items-center ${topic.enabled !== false ? 'bg-midnight-cherry justify-end' : 'bg-muted justify-start'}`}>
        <span className="w-6 h-6 rounded-full bg-white shadow" />
      </button>
    </div>
    <textarea aria-label={`${topic.title || 'Topic'} information`} value={topic.content || ''} maxLength={2000} onChange={e => onChange({ ...topic, content: e.target.value })}
      rows={4} placeholder="What Smashie should know about this topic" className="w-full p-3 rounded-lg border border-border bg-background" />
    <button type="button" onClick={onDelete} className="min-h-11 text-sm text-midnight-cherry font-semibold">Remove topic</button>
  </div>;
}