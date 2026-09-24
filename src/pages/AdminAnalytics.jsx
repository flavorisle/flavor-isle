import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';
import OrderVolumeChart from '@/components/admin/analytics/OrderVolumeChart';
import TopItemsChart from '@/components/admin/analytics/TopItemsChart';
import CustomerGrowthChart from '@/components/admin/analytics/CustomerGrowthChart';

export default function AdminAnalytics() {
  const [orders, setOrders] = useState(null);
  const [profiles, setProfiles] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      // Last 30 days of paid orders for volume + top-items charts.
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const [orderList, profileList] = await Promise.all([
        base44.entities.Order.filter(
          { payment_status: 'paid', created_date: { $gte: since.toISOString() } },
          '-created_date',
          1000
        ).catch(() => []),
        base44.entities.CustomerProfile.list('-created_date', 1000).catch(() => []),
      ]);
      setOrders(orderList || []);
      setProfiles(profileList || []);
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Could not load analytics');
      setOrders((p) => p || []);
      setProfiles((p) => p || []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loading = !orders || !profiles;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <AdminNav />

      {/* Hero */}
      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 size={24} className="text-[hsl(var(--primary))]" />
            <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">ANALYTICS</p>
          </div>
          <h1 className="font-heading text-4xl text-white">Store Metrics</h1>
          <p className="text-gray-300 mt-3 max-w-2xl">Daily order volume, top-selling items, and customer growth trends.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
          <h2 className="font-heading text-2xl text-obsidian-roast">Key Metrics</h2>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 text-xs font-heading text-patina-mint bg-patina-mint/10 hover:bg-patina-mint/20 px-3 py-2 rounded-full transition-colors tap-44 disabled:opacity-60"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-20 justify-center">
            <Loader2 size={18} className="animate-spin" /> Loading analytics…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-6">
            <OrderVolumeChart orders={orders} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopItemsChart orders={orders} />
              <CustomerGrowthChart profiles={profiles} />
            </div>
            <p className="text-xs text-muted-foreground">
              Based on paid, non-cancelled orders from the last 30 days. Times are in store local time (America/Chicago).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}