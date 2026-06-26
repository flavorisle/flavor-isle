import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BUSYNESS_COLORS = {
  'Running Smooth': '#22c55e',      // green
  'A Little Busy': '#eab308',       // yellow
  'Expecting a Short Wait': '#ef4444' // red
};

const getBusynessColor = (count) => {
  if (count >= 8) return 'Expecting a Short Wait';
  if (count >= 5) return 'A Little Busy';
  return 'Running Smooth';
};

export default function BusynessTracker() {
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHourlyData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const metrics = await base44.entities.HourlyMetrics.filter({ date: today });
      
      // Create array for all 24 hours
      const hourMap = {};
      (metrics || []).forEach(m => {
        hourMap[m.hour] = m;
      });
      
      const fullDay = Array.from({ length: 24 }, (_, i) => {
        const existing = hourMap[i] || {};
        return {
          hour: i,
          label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
          count: existing.order_count || 0,
          level: existing.busyness_level || getBusynessColor(existing.order_count || 0),
          ...existing
        };
      });
      
      setHourlyData(fullDay);
      setLoading(false);
    };

    loadHourlyData();
    const unsubscribe = base44.entities.HourlyMetrics.subscribe(() => loadHourlyData());
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="card-diner p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="card-diner p-6">
      <div className="mb-6">
        <h3 className="font-heading text-xl text-obsidian-roast mb-2">Restaurant Busy Times</h3>
        <p className="text-sm text-muted-foreground">Active orders by hour today</p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'count') return [value, 'Orders'];
              return value;
            }}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
          />
          <Bar dataKey="count" fill="#C0392B" name="Active Orders" radius={[8, 8, 0, 0]}>
            {hourlyData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={BUSYNESS_COLORS[entry.level]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-6 mt-6 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Running Smooth (&lt;5 orders)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-400" />
          <span>A Little Busy (5–7 orders)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Expecting Wait (8+ orders)</span>
        </div>
      </div>
    </div>
  );
}