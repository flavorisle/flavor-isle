import React from 'react';
import { Search, Loader2, Phone, Mail, AlertTriangle } from 'lucide-react';

// Issue #96, section B: the search box and results list for the customer
// directory. Presentational — the page owns the query and the results, and it
// shows the directory's own reason when the directory cannot be reached instead
// of an empty list that would read as "no such customer".
export default function CustomerDirectorySearch({ query, onQueryChange, onSubmit, loading, results, error, selectedId, onSelect }) {
  return (
    <div className="card-diner p-4">
      <h2 className="font-heading text-base text-obsidian-roast mb-3">Customer directory</h2>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="flex gap-2 mb-3"
      >
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Phone, email, or name"
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
          aria-label="Search the customer directory"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-mint px-4 py-2.5 text-xs font-heading flex items-center gap-1.5 disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-smashie-yellow/50 bg-smashie-yellow/10 p-3 flex items-start gap-2 mb-3">
          <AlertTriangle size={15} className="text-obsidian-roast flex-shrink-0 mt-0.5" />
          <p className="text-xs text-obsidian-roast">{error}</p>
        </div>
      )}

      {loading && results.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Searching the directory…</p>
      ) : results.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          {query ? `No one in the directory matches “${query}”.` : 'Search by phone, email, or name to open a customer.'}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {results.map((customer) => (
            <li key={customer.pulse_customer_id || customer.normalized_phone || customer.email || customer.name}>
              <button
                onClick={() => onSelect(customer)}
                className={`w-full text-left py-3 px-2 rounded-xl transition-colors ${selectedId === customer.pulse_customer_id ? 'bg-patina-mint/10' : 'hover:bg-muted'}`}
              >
                <p className="font-heading text-sm text-obsidian-roast">{customer.name || 'Unnamed customer'}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  {customer.phone && (<span className="inline-flex items-center gap-1"><Phone size={11} /> {customer.phone}</span>)}
                  {customer.email && (<span className="inline-flex items-center gap-1"><Mail size={11} /> {customer.email}</span>)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {customer.online_orders} online · ${Number(customer.online_total_spent || 0).toFixed(2)}
                  {customer.in_store_orders > 0 && <> · {customer.in_store_orders} in-store</>}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}