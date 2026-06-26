import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const data = await base44.entities.MenuItem.list();
    setItems(data || []);
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncSquareCatalog', {});
      await loadItems();
    } finally {
      setSyncing(false);
    }
  };

  const toggleHide = async (item) => {
    const updated = { is_hidden: !item.is_hidden };
    await base44.entities.MenuItem.update(item.id, updated);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
  };

  const toggleAvailable = async (item) => {
    const updated = { is_available: !item.is_available };
    await base44.entities.MenuItem.update(item.id, updated);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
  };

  const grouped = {};
  items
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .forEach(item => {
      const cat = item.square_category || item.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-1">Admin</p>
            <h1 className="font-heading text-3xl text-white">Menu Manager</h1>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 btn-mint chrome-hover px-5 py-2.5 text-sm font-heading disabled:opacity-60"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync from Square'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-3 bg-white border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 mb-8"
        />

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading…</div>
        ) : (
          Object.entries(grouped).map(([category, catItems]) => (
            <div key={category} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Tag size={16} className="text-patina-mint" />
                <h2 className="font-heading text-lg text-obsidian-roast">{category}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{catItems.length}</span>
              </div>
              <div className="space-y-3">
                {catItems.map(item => (
                  <div key={item.id} className={`card-diner overflow-hidden transition-all ${item.is_hidden ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-4 p-4">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 flex items-center justify-center text-2xl">
                          {item.category === 'Burgers' ? '🍔' : item.category === 'Shakes' ? '🥤' : item.category === 'Sides' ? '🍟' : '🍽️'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-sm text-obsidian-roast">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-midnight-cherry font-semibold text-sm">${item.price?.toFixed(2)}</span>
                          {item.modifiers?.length > 0 && (
                            <span className="text-xs text-patina-mint">{item.modifiers.length} modifier group{item.modifiers.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Available toggle */}
                        <button
                          onClick={() => toggleAvailable(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-colors ${
                            item.is_available !== false
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          {item.is_available !== false ? 'In Stock' : 'Out of Stock'}
                        </button>

                        {/* Hide toggle */}
                        <button
                          onClick={() => toggleHide(item)}
                          title={item.is_hidden ? 'Show on menu' : 'Hide from menu'}
                          className={`p-2 rounded-xl transition-colors ${
                            item.is_hidden
                              ? 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                              : 'bg-muted text-muted-foreground hover:bg-gray-200'
                          }`}
                        >
                          {item.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>

                        {/* Expand modifiers */}
                        {item.modifiers?.length > 0 && (
                          <button
                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            className="p-2 rounded-xl bg-muted hover:bg-gray-200 transition-colors text-muted-foreground"
                          >
                            {expandedId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Modifier detail panel */}
                    {expandedId === item.id && item.modifiers?.length > 0 && (
                      <div className="border-t border-border bg-muted/40 px-4 py-4 space-y-4">
                        {item.modifiers.map((group, gi) => (
                          <div key={gi}>
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-heading text-xs uppercase tracking-widest text-obsidian-roast">{group.name}</p>
                              <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded-full border border-border">
                                {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(group.modifiers || []).map((mod, mi) => (
                                <span key={mi} className="bg-white border border-border rounded-xl px-3 py-1.5 text-xs text-obsidian-roast">
                                  {mod.name} {mod.price > 0 ? <span className="text-patina-mint ml-1">+${mod.price.toFixed(2)}</span> : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}