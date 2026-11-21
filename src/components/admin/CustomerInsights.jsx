import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Store, Globe, UserPlus } from 'lucide-react';
import LapsedCustomerList from '@/components/admin/LapsedCustomerList';

// Issue #325 Part 2: the customer dashboard's headline numbers and the three
// lapse segments, read from CustomerProfile + Order (never Pulse). Clicking a
// segment lists the customers in it, with a CSV of exactly that list.
const SEGMENTS = [
  { key: 'd30', label: '30–59 days', hint: 'Just slipping away' },
  { key: 'd60', label: '60–179 days', hint: 'Gone quiet' },
  { key: 'd180', label: '180+ days', hint: 'Long gone' },
];

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card-diner p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon size={15} />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-heading text-2xl text-obsidian-roast">{value}</p>
    </div>
  );
}

export default function CustomerInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('getCustomerInsights', {});
        const payload = res?.data || res;
        if (payload?.error) throw new Error(payload.error);
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err.message || 'The customer numbers could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="card-diner p-6 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading customer numbers…</p>
      </div>
    );
  }

  if (error) {
    return <div className="card-diner p-4 text-sm text-destructive">{error}</div>;
  }

  const totals = data?.totals || {};
  const segments = data?.segments || {};
  const active = selected ? segments[selected] : null;
  const activeLabel = SEGMENTS.find((s) => s.key === selected)?.label || '';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label="Customers" value={totals.customers ?? 0} />
        <Stat icon={Store} label="In-store" value={totals.in_store ?? 0} />
        <Stat icon={Globe} label="Online" value={totals.online ?? 0} />
        <Stat icon={UserPlus} label="New this month" value={totals.new_this_month ?? 0} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SEGMENTS.map((segment) => {
          const isActive = selected === segment.key;
          return (
            <button
              key={segment.key}
              onClick={() => setSelected(isActive ? null : segment.key)}
              className={`text-left rounded-2xl border-2 p-4 transition-colors ${
                isActive
                  ? 'border-midnight-cherry bg-midnight-cherry/5'
                  : 'border-border bg-white hover:border-midnight-cherry/40'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                No purchase in
              </p>
              <p className="font-heading text-xl text-obsidian-roast leading-tight">{segment.label}</p>
              <p className="font-heading text-3xl text-midnight-cherry">{segments[segment.key]?.count ?? 0}</p>
              <p className="text-xs text-muted-foreground">{segment.hint}</p>
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="card-diner p-4">
          <LapsedCustomerList label={activeLabel} customers={active.customers} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tap a group to see who is in it, with their last purchase, channel and lifetime total.
        </p>
      )}
    </div>
  );
}