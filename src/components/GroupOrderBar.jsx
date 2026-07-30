import React, { useState } from 'react';
import { Users, Plus, Check, X, UserPlus, ChevronDown } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function GroupOrderBar() {
  const {
    groupMode, people, activePerson, setActivePersonId,
    startGroupOrder, endGroupOrder, addPerson, removePerson, personSubtotals,
  } = useCart();
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState('');

  if (!groupMode) {
    return (
      <div className="bg-patina-mint/10 border-y border-patina-mint/20 px-4 py-2.5 text-center">
        <button
          onClick={startGroupOrder}
          className="inline-flex items-center gap-2 text-sm font-heading text-patina-mint hover:text-midnight-cherry transition-colors"
        >
          <Users size={15} /> Start a Group Order <span className="text-xs text-muted-foreground font-body normal-case">— everyone orders under their name, one fee</span>
        </button>
      </div>
    );
  }

  const handleAdd = () => {
    const id = addPerson(newName);
    if (id) {
      setActivePersonId(id);
      setNewName('');
    }
  };

  return (
    <>
      <div className="bg-patina-mint text-white px-3 py-2.5 sticky top-0 z-30 safe-top">
        <div className="max-w-6xl mx-auto flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-widest opacity-90">
            <Users size={14} /> Group Order
          </span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            {people.map(p => {
              const ps = personSubtotals.find(x => x.id === p.id);
              const isActive = activePerson?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePersonId(p.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading transition-all ${
                    isActive ? 'bg-smashie-yellow text-patina-mint' : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  {isActive && <Check size={11} />}
                  {p.name}
                  {ps?.itemCount > 0 && <span className="opacity-70 font-body normal-case">({ps.itemCount})</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setManageOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-heading transition-colors"
          >
            <UserPlus size={13} /> Add
          </button>
          <button
            onClick={endGroupOrder}
            className="flex-shrink-0 px-2.5 py-1.5 rounded-full bg-midnight-cherry hover:bg-red-700 text-white text-xs font-heading transition-colors"
          >
            End
          </button>
        </div>
        {activePerson && (
          <div className="max-w-6xl mx-auto mt-1 text-xs text-white/80 font-body">
            Adding items for <span className="font-semibold text-smashie-yellow">{activePerson.name}</span>
          </div>
        )}
      </div>

      {manageOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setManageOpen(false)}>
          <div className="bg-white rounded-3xl shadow-float-lg w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-xl text-obsidian-roast">Group Members</h3>
              <button onClick={() => setManageOpen(false)} className="p-2 hover:bg-muted rounded-full"><X size={18} /></button>
            </div>
            <div className="flex gap-2 mb-5">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Add a name (e.g. Alex)"
                className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
              />
              <button onClick={handleAdd} className="btn-cherry px-4 py-2.5 text-sm font-heading flex items-center gap-1">
                <Plus size={15} /> Add
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {people.map(p => {
                const ps = personSubtotals.find(x => x.id === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted">
                    <div>
                      <p className="font-heading text-sm text-obsidian-roast">{p.name}</p>
                      {ps?.itemCount > 0 && <p className="text-xs text-muted-foreground">{ps.itemCount} items · ${ps.subtotal.toFixed(2)}</p>}
                    </div>
                    <button
                      onClick={() => removePerson(p.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-white rounded-lg transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
              {people.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No members yet.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}