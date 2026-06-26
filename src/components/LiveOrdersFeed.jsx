import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, MapPin, TrendingUp } from 'lucide-react';

export default function LiveOrdersFeed() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, preparing: 0 });

  useEffect(() => {
    const loadOrders = async () => {
      const result = await base44.entities.Order.list('-created_date', 10);
      const active = result.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
      setOrders(active);
      setStats({
        total: active.length,
        pending: active.filter(o => o.status === 'pending').length,
        preparing: active.filter(o => ['confirmed', 'preparing'].includes(o.status)).length
      });
    };

    loadOrders();

    // Subscribe to order changes
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (['create', 'update'].includes(event.type)) {
        loadOrders();
      }
    });

    return unsubscribe;
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-700';
      case 'confirmed': return 'bg-yellow-100 text-yellow-700';
      case 'preparing': return 'bg-orange-100 text-orange-700';
      case 'ready': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSourceBadge = (order) => {
    if (order.square_order_id) return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Square POS</span>;
    if (order.stripe_session_id) return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Online</span>;
    return <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Phone</span>;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={20} className="text-patina-mint" />
        <h2 className="font-heading text-2xl text-obsidian-roast">Live Orders</h2>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card-diner p-4 text-center">
          <p className="text-xs text-muted-foreground font-heading uppercase mb-1">Active</p>
          <p className="font-heading text-2xl text-midnight-cherry">{stats.total}</p>
        </div>
        <div className="card-diner p-4 text-center">
          <p className="text-xs text-muted-foreground font-heading uppercase mb-1">Pending</p>
          <p className="font-heading text-2xl text-red-600">{stats.pending}</p>
        </div>
        <div className="card-diner p-4 text-center">
          <p className="text-xs text-muted-foreground font-heading uppercase mb-1">In Progress</p>
          <p className="font-heading text-2xl text-orange-600">{stats.preparing}</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="card-diner p-6 text-center text-muted-foreground">
            <p>No active orders at the moment.</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="card-diner p-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-heading text-obsidian-roast font-semibold">{order.customer_name}</p>
                  {getSourceBadge(order)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{order.order_type.toUpperCase()} • {order.items?.length || 0} items</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(order.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {order.delivery_address && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {order.delivery_address}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                <span className={`text-xs font-heading px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}