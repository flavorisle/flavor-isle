import React from 'react';
import { User, Send } from 'lucide-react';

export default function ManagementMessageCard({ item }) {
  return (
    <article className="card-diner p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-base text-obsidian-roast flex items-center gap-2">
            <User size={15} /> {item.caller_name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{item.caller_phone || 'No callback number'}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-midnight-cherry/10 text-midnight-cherry font-semibold capitalize">{item.status || 'new'}</span>
      </div>
      <div className="mt-3 rounded-xl bg-muted/60 p-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Send size={12} /> For {item.recipient || 'management'}</p>
        <p className="text-sm text-obsidian-roast whitespace-pre-wrap">{item.message}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-3">{item.created_date ? new Date(item.created_date).toLocaleString() : ''}</p>
    </article>
  );
}