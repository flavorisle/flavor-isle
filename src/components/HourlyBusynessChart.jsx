import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function HourlyBusynessChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHourlyData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const metrics = await base44.entities.HourlyMetrics.filter({ date: today });
        
        if (metrics && metrics.length > 0) {
          // Sort by hour and format for chart
          const sorted = metrics.sort((a, b) => a.hour - b.hour);
          const chartData = sorted.map(m => ({
            time: `${String(m.hour).padStart(2, '0')}:00`,
            orders: m.order_count || 0,
            hour: m.hour,
            busyness: m.busyness_level || 'Running Smooth'
          }));
          setData(chartData);
        }
      } catch (error) {
        console.error('Error loading hourly metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHourlyData();
  }, []);

  const currentHour = new Date().getHours();
  const currentData = data.find(d => d.hour === currentHour);

  const getColor = (busyness) => {
    if (!busyness) return '#10b981';
    if (busyness === 'Expecting a Short Wait') return '#ef4444';
    if (busyness === 'A Little Busy') return '#f59e0b';
    return '#10b981';
  };

  if (loading) {
    return (
      <div className="card-diner p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card-diner p-6 text-center text-muted-foreground">
        <p className="text-sm">Busyness data coming soon...</p>
      </div>
    );
  }

  return (
    <div className="card-diner p-6">
      <div className="mb-6">
        <h3 className="font-heading text-lg text-obsidian-roast mb-1">Hourly Busyness</h3>
        <p className="text-xs text-muted-foreground">Orders by hour today</p>
      </div>

      {currentData && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-patina-mint/10 to-midnight-cherry/10 border border-midnight-cherry/20">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Right Now ({currentData.time})</p>
          <div className="flex items-baseline justify-between">
            <p className="font-heading text-2xl text-obsidian-roast">{currentData.orders} orders</p>
            <span className={`text-xs font-heading px-3 py-1 rounded-full ${
              currentData.busyness === 'Expecting a Short Wait' ? 'bg-red-100 text-red-700' :
              currentData.busyness === 'A Little Busy' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {currentData.busyness}
            </span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="time" 
            stroke="#999" 
            style={{ fontSize: '12px' }}
            tick={{ angle: -45, textAnchor: 'end', height: 80 }}
          />
          <YAxis stroke="#999" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
            formatter={(value) => [value, 'Orders']}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Bar 
            dataKey="orders" 
            fill="#C0392B" 
            radius={[8, 8, 0, 0]}
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}