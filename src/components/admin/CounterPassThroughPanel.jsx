import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import CounterPassThroughForm from '@/components/admin/CounterPassThroughForm';
import CounterPassThroughRow from '@/components/admin/CounterPassThroughRow';
import { Loader2, PhoneForwarded } from 'lucide-react';

// Pass-through manager. A number on this list skips Smashie completely and
// rings the counter phone directly, so the crew picks it up themselves. It
// applies while the store is open, and a blocked number stays blocked.
export default function CounterPassThroughPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => base44.entities.CounterPassThrough.list('-created_date', 200);
    load().then((rows) => { setEntries(rows || []); setLoading(false); });
    const unsubscribe = base44.entities.CounterPassThrough.subscribe((event) => {
      setEntries((current) => {
        if (event.type === 'delete') return current.filter((e) => e.id !== event.id);
        if (event.type === 'create') return current.some((e) => e.id === event.data.id) ? current : [event.data, ...current];
        return current.map((e) => (e.id === event.data.id ? event.data : e));
      });
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-border p-4 flex gap-3">
        <PhoneForwarded className="text-midnight-cherry flex-shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-muted-foreground">
          Calls from these numbers skip Smashie and ring the counter phone instead, so a person answers. This works while the store is
          open; after hours the normal closed message runs. A number that is also on the block list stays blocked.
        </p>
      </div>

      <CounterPassThroughForm onAdded={(created) => setEntries((current) => [created, ...current])} />

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No numbers ring the counter directly yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <CounterPassThroughRow
              key={entry.id}
              entry={entry}
              onChanged={(updated) => setEntries((current) => current.map((e) => (e.id === updated.id ? updated : e)))}
              onRemoved={(id) => setEntries((current) => current.filter((e) => e.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}