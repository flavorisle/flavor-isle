import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, AlertCircle, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

export default function BusynessStatus() {
  const [activeOrders, setActiveOrders] = useState(0);
  const [busynessLevel, setBusynessLevel] = useState('Running Smooth');
  const [busynessColor, setBusynessColor] = useState('bg-green-100 text-green-700');
  const [icon, setIcon] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);

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

    const loadHourlyMetrics = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const metrics = await base44.entities.HourlyMetrics.filter({ date: today });
        
        if (metrics && metrics.length > 0) {
          const sorted = metrics.sort((a, b) => a.hour - b.hour);
          const chartData = sorted.map(m => ({
            time: `${String(m.hour).padStart(2, '0')}:00`,
            orders: m.order_count || 0,
            hour: m.hour
          }));
          setHourlyData(chartData);
        }
      } catch (error) {
        console.error('Error loading hourly metrics:', error);
      }
    };

    loadOrders();
    loadHourlyMetrics();
    const unsubscribe = base44.entities.Order.subscribe(() => loadOrders());
    return unsubscribe;
  }, []);

  const IconComponent = icon;

  return (
    <div className="space-y-4">
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

      {hourlyData.length > 0 && (
        <div className="card-diner p-4 border border-midnight-cherry/10">
          <p className="text-xs font-heading text-muted-foreground uppercase tracking-wider mb-3">Orders by Hour (Today)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#999" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#999" style={{ fontSize: '11px' }} width={30} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px' }} />
              <Bar dataKey="orders" fill="#C0392B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}