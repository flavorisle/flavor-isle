import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminNav from '@/components/admin/AdminNav';
import CustomerDirectorySearch from '@/components/admin/CustomerDirectorySearch';
import CustomerProfilePanel from '@/components/admin/CustomerProfilePanel';
import UnlinkedOrdersCounter from '@/components/admin/UnlinkedOrdersCounter';

// Admin → Customers (issue #96, section B).
//
// The directory of record is the Pulse app's own Customer directory; this page
// searches it and shows one person's full history (every order linked to them,
// online and in-store). The link between an order and a person lives on the
// order itself, so the history is complete from the person's first order onward.
//
// Nothing here is invented: if the Pulse directory has not been connected yet,
// the page says exactly that instead of showing an empty list.
export default function AdminCustomers() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const runSearch = useCallback(async (searchTerm) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('searchCustomerDirectory', {
        query: (searchTerm || '').trim(),
        limit: 25,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setResults(data?.directory || []);
      setError(data?.directory_error || '');
    } catch (err) {
      setResults([]);
      setError(err?.response?.data?.error || err.message || 'The directory could not be searched.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch('');
  }, [runSearch]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <AdminNav />
        <div className="mb-5">
          <h1 className="font-heading text-3xl text-obsidian-roast">Customers</h1>
          <p className="text-sm text-muted-foreground">Search the customer directory and see everything we hold for one person.</p>
        </div>

        <div className="mb-4">
          <UnlinkedOrdersCounter />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CustomerDirectorySearch
            query={query}
            onQueryChange={setQuery}
            onSubmit={() => runSearch(query)}
            loading={loading}
            results={results}
            error={error}
            selectedId={selected?.pulse_customer_id}
            onSelect={setSelected}
          />
          <CustomerProfilePanel customer={selected} />
        </div>
      </div>
      <Footer />
    </div>
  );
}