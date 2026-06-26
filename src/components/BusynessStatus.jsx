import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, AlertCircle, Zap } from 'lucide-react';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

export default function BusynessStatus() {
  const [activeOrders, setActiveOrders] = useState(0);
  const [busynessLevel, setBusynessLevel] = useState('Running Smooth');
  const [busynessColor, setBusynessColor] = useState('bg-green-100 text-green-700');
  const [icon, setIcon] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      const orders = await base44.entities.Order.list();
      const active = (orders || []).filter(o => ACTIVE_STATUSES.includes(o.status)).length;
      setActiveOrders(active);

      // Calculate busyness level
      let level = 'Running Smooth';
      let color = 'bg-green-100 text-green-700';
      let iconComponent = null;

      if (active >= 15) {
        level = 'Expecting a Short Wait';
        color = 'bg-red-100 text-red-700';
        iconComponent = AlertCircle;
      } else if (active >= 8) {
        level = 'A Little Busy';
        color = 'bg-yellow-100 text-yellow-700';
        iconComponent = TrendingUp;
      } else {
        iconComponent = Zap;
      }

      setBusynessLevel(level);
      setBusynessColor(color);
      setIcon(iconComponent);
    };

    loadOrders();
    const unsubscribe = base44.entities.Order.subscribe(() => loadOrders());
    return unsubscribe;
  }, []);

  const IconComponent = icon;

  return (
    <div className={`card-diner p-4 flex items-center justify-between border-2 border-midnight-cherry/20 ${busynessColor}`}>
      <div className="flex items-center gap-3">
        {IconComponent && <IconComponent size={20} />}
        <div>
          <p className="text-xs font-heading uppercase tracking-wider opacity-75">Status</p>
          <p className="font-heading text-lg">{busynessLevel}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-heading">{activeOrders}</p>
        <p className="text-xs opacity-75">Active Orders</p>
      </div>
    </div>
  );
}