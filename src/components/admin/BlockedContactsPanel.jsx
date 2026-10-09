import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import BlockedContactForm from '@/components/admin/BlockedContactForm';
import BlockedContactRow from '@/components/admin/BlockedContactRow';
import { Loader2, ShieldOff } from 'lucide-react';

// Blocklist manager. A blocked number or customer can't place an order on the
// phone, by text, in website chat, or at online checkout — Smashie politely
// declines and can still take a message for the crew.
export default function BlockedContactsPanel() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => base44.entities.BlockedContact.list('-created_date', 200);
    load().then((rows) => { setBlocks(rows || []); setLoading(false); });
    const unsubscribe = base44.entities.BlockedContact.subscribe((event) => {
      setBlocks((current) => {
        if (event.type === 'delete') return current.filter((b) => b.id !== event.id);
        if (event.type === 'create') return current.some((b) => b.id === event.data.id) ? current : [event.data, ...current];
        return current.map((b) => (b.id === event.data.id ? event.data : b));
      });
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-border p-4 flex gap-3">
        <ShieldOff className="text-midnight-cherry flex-shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-muted-foreground">
          Blocked callers hear Smashie politely decline their order and can still leave a message for the crew. Their number is turned away
          on calls, texts, website chat, and online checkout. Nothing is ever said to them about being blocked.
        </p>
      </div>

      <BlockedContactForm onAdded={(created) => setBlocks((current) => [created, ...current])} />

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : blocks.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No numbers or customers are blocked.</p>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <BlockedContactRow
              key={block.id}
              block={block}
              onChanged={(updated) => setBlocks((current) => current.map((b) => (b.id === updated.id ? updated : b)))}
              onRemoved={(id) => setBlocks((current) => current.filter((b) => b.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}