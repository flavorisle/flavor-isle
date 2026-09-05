import React, { useEffect, useState } from 'react';
import { RefreshCw, MessagesSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ManagementMessageCard from '@/components/admin/ManagementMessageCard';

export default function ManagementMessageLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setItems(await base44.entities.PhoneMessage.list('-created_date', 100));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{items.length} management message{items.length === 1 ? '' : 's'}</p>
        <button onClick={load} className="tap-44 flex items-center gap-1.5 text-xs font-heading text-patina-mint hover:text-midnight-cherry"><RefreshCw size={12} /> Refresh</button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground text-center py-12">Loading messages…</p> : items.length === 0 ? (
        <div className="text-center py-12"><MessagesSquare size={40} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground" /><p className="font-heading text-obsidian-roast">No management messages yet</p></div>
      ) : <div className="space-y-3">{items.map(item => <ManagementMessageCard key={item.id} item={item} />)}</div>}
    </div>
  );
}