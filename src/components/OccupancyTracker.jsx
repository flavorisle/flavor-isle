import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, TrendingUp, Plus, X } from 'lucide-react';

const MAX_CAPACITY = 50;

export default function OccupancyTracker() {
  const [seatedParties, setSeatedParties] = useState([]);
  const [totalOccupancy, setTotalOccupancy] = useState(0);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [formData, setFormData] = useState({ customer_name: '', party_size: 1, table_number: '' });

  useEffect(() => {
    const loadOccupancy = async () => {
      const result = await base44.entities.Occupancy.filter({ status: 'seated' });
      setSeatedParties(result);
      const total = result.reduce((sum, party) => sum + party.party_size, 0);
      setTotalOccupancy(total);
    };

    loadOccupancy();

    const unsubscribe = base44.entities.Occupancy.subscribe((event) => {
      if (['create', 'update'].includes(event.type)) {
        loadOccupancy();
      }
    });

    return unsubscribe;
  }, []);

  const handleCheckIn = async () => {
    if (!formData.customer_name || formData.party_size < 1) return;
    
    await base44.entities.Occupancy.create({
      customer_name: formData.customer_name,
      party_size: parseInt(formData.party_size),
      table_number: formData.table_number || null,
      checked_in_at: new Date().toISOString(),
      status: 'seated'
    });

    setFormData({ customer_name: '', party_size: 1, table_number: '' });
    setShowCheckIn(false);
  };

  const handleCheckOut = async (id) => {
    await base44.entities.Occupancy.update(id, {
      status: 'checked_out',
      checked_out_at: new Date().toISOString()
    });
  };

  const occupancyPercent = Math.round((totalOccupancy / MAX_CAPACITY) * 100);
  const busynessLevel = totalOccupancy > 40 ? 'Peak' : totalOccupancy > 25 ? 'Busy' : totalOccupancy > 10 ? 'Moderate' : 'Quiet';
  const busynessColor = totalOccupancy > 40 ? 'bg-red-100 text-red-700' : totalOccupancy > 25 ? 'bg-orange-100 text-orange-700' : totalOccupancy > 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Users size={20} className="text-patina-mint" />
        <h2 className="font-heading text-2xl text-obsidian-roast">Restaurant Occupancy</h2>
      </div>

      {/* Capacity Bar */}
      <div className="card-diner p-6 mb-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs font-heading text-muted-foreground uppercase tracking-wider mb-2">Current Occupancy</p>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl text-obsidian-roast">{totalOccupancy}</span>
              <span className="text-muted-foreground text-sm">/ {MAX_CAPACITY} capacity</span>
            </div>
          </div>
          <span className={`font-heading text-sm px-4 py-2 rounded-full ${busynessColor}`}>
            {busynessLevel}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              totalOccupancy > 40 ? 'bg-red-500' :
              totalOccupancy > 25 ? 'bg-orange-500' :
              totalOccupancy > 10 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{occupancyPercent}% capacity</p>
      </div>

      {/* Seated Parties */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg text-obsidian-roast">Seated Parties ({seatedParties.length})</h3>
          <button
            onClick={() => setShowCheckIn(!showCheckIn)}
            className="flex items-center gap-2 px-4 py-2 bg-midnight-cherry text-white rounded-full text-sm font-heading hover:bg-red-800 transition-colors"
          >
            <Plus size={16} /> Check In
          </button>
        </div>

        {/* Check-In Form */}
        {showCheckIn && (
          <div className="card-diner p-4 mb-4 border-2 border-midnight-cherry/30">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Customer Name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm font-body"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={formData.party_size}
                  onChange={(e) => setFormData({ ...formData, party_size: e.target.value })}
                  className="px-3 py-2 border border-border rounded-lg text-sm font-body"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(size => (
                    <option key={size} value={size}>{size} {size === 1 ? 'Person' : 'People'}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Table #"
                  value={formData.table_number}
                  onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                  className="px-3 py-2 border border-border rounded-lg text-sm font-body"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCheckIn}
                  className="flex-1 px-4 py-2 bg-midnight-cherry text-white rounded-lg text-sm font-heading hover:bg-red-800 transition-colors"
                >
                  Check In
                </button>
                <button
                  onClick={() => setShowCheckIn(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-obsidian-roast rounded-lg text-sm font-heading hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Parties List */}
        <div className="space-y-2">
          {seatedParties.length === 0 ? (
            <div className="card-diner p-4 text-center text-muted-foreground text-sm">
              No parties seated right now.
            </div>
          ) : (
            seatedParties.map(party => (
              <div key={party.id} className="card-diner p-4 flex items-center justify-between">
                <div>
                  <p className="font-heading text-obsidian-roast">{party.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {party.party_size} {party.party_size === 1 ? 'person' : 'people'}
                    {party.table_number && ` • Table ${party.table_number}`}
                  </p>
                </div>
                <button
                  onClick={() => handleCheckOut(party.id)}
                  className="p-2 text-muted-foreground hover:text-red-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}