import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, Mail, MapPin, Loader2, CalendarDays, Receipt } from 'lucide-react';

// Issue #96, section B: one customer's full history — everything the directory
// knows about them plus every order this app holds for them. The orders come
// from one server call filtered on the customer's own link (normalized phone or
// profile id), so the history is complete rather than whatever happened to be
// loaded on screen.
export default function CustomerProfilePanel({ customer }) {
  const [state, setState] = useState({ loading: true, profile: null, orders: [], truncated: false, stats: null, error: '' });

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    setState({ loading: true, profile: null, orders: [], truncated: false, stats: null, error: '' });
    (async () => {
      try {
        const res = await base44.functions.invoke('searchCustomerDirectory', { customer });
        const data = res?.data || res;
        if (cancelled) return;
        if (data?.error) throw new Error(data.error);
        setState({
          loading: false,
          profile: data?.profile || null,
          orders: data?.orders || [],
          truncated: !!data?.orders_truncated,
          stats: data?.stats || null,
          error: '',
        });
      } catch (error) {
        if (!cancelled) setState({ loading: false, profile: null, orders: [], truncated: false, stats: null, error: error.message || 'Could not load this customer.' });
      }
    })();
    return () => { cancelled = true; };
  }, [customer]);

  if (!customer) {
    return (
      <div className="card-diner p-6 text-center">
        <p className="text-sm text-muted-foreground">Pick a customer from the search results to see their profile and order history.</p>
      </div>
    );
  }

  const address = state.profile?.delivery_address || state.profile?.address || '';
  // Issue #123 B3: the history call computes the counters from the merged order
  // history; the directory's own all-zero counters are only a fallback.
  const statSource = state.stats || customer;

  return (
    <div className="space-y-4">
      <div className="card-diner p-4">
        <h2 className="font-heading text-xl text-obsidian-roast">{customer.name || 'Unnamed customer'}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm">
          {customer.phone && (
            <a href={`tel:${String(customer.phone).replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 text-patina-mint hover:text-midnight-cherry">
              <Phone size={14} /> {customer.phone}
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1.5 text-patina-mint hover:text-midnight-cherry">
              <Mail size={14} /> {customer.email}
            </a>
          )}
          {address && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><MapPin size={14} /> {address}</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Online orders', value: statSource.online_orders ?? 0 },
            { label: 'Online total', value: `$${Number(statSource.online_total_spent || 0).toFixed(2)}` },
            { label: 'In-store orders', value: statSource.in_store_orders ?? 0 },
            { label: 'In-store total', value: `$${Number(statSource.in_store_total_spent || 0).toFixed(2)}` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="font-heading text-base text-obsidian-roast">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-xs text-muted-foreground">
          {customer.first_order_date && (
            <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> First order {formatDate(customer.first_order_date)}</span>
          )}
          {customer.last_order_date && (
            <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> Last order {formatDate(customer.last_order_date)}</span>
          )}
          {customer.last_order_source && <span>Last seen via {customer.last_order_source}</span>}
          {customer.birthday && <span>Birthday {customer.birthday}</span>}
        </div>

        {customer.notes && (
          <div className="mt-4 rounded-xl border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes on file</p>
            <p className="text-sm text-obsidian-roast whitespace-pre-line">{customer.notes}</p>
          </div>
        )}
      </div>

      <div className="card-diner p-4">
        <h3 className="font-heading text-base text-obsidian-roast mb-3 flex items-center gap-2">
          <Receipt size={16} /> Order history
        </h3>
        {state.loading ? (
          <p className="text-xs text-muted-foreground flex items-center gap-2 py-4"><Loader2 size={14} className="animate-spin" /> Loading orders…</p>
        ) : state.error ? (
          <p className="text-xs text-destructive py-2">{state.error}</p>
        ) : state.orders.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No orders in this app are linked to this customer yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {state.orders.map((order) => (
              <li key={order.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast">
                    #{order.order_number} · {order.order_source === 'in_store' ? 'In store' : 'Online'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.created_date)} · {order.status?.replace('_', ' ')} · {(order.items || []).length} item{(order.items || []).length === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-patina-mint whitespace-nowrap">${Number(order.total || 0).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
        {state.truncated && (
          <p className="text-xs text-muted-foreground mt-2">Showing the 25 most recent orders.</p>
        )}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}