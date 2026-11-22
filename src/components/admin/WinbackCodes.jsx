import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Tag } from 'lucide-react';

// Issue #325 Part 3: the win-back codes customers can type at online checkout.
// They ship switched off; this is where one is turned on for a send and turned
// back off afterwards. The percentage, minimum and expiry live on the PromoCode
// record and are enforced by the server at checkout, never by this screen.
export default function WinbackCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const rows = await base44.entities.PromoCode.list('-percent_off', 20);
        setCodes(Array.isArray(rows) ? rows : []);
      } catch (err) {
        setError(err.message || 'The promo codes could not be loaded.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (promo) => {
    setBusy(promo.id);
    setError('');
    try {
      const next = !promo.is_active;
      await base44.entities.PromoCode.update(promo.id, { is_active: next });
      setCodes((prev) => prev.map((c) => (c.id === promo.id ? { ...c, is_active: next } : c)));
    } catch (err) {
      setError(err.message || 'That code could not be switched.');
    } finally {
      setBusy('');
    }
  };

  if (loading || codes.length === 0) return null;

  return (
    <div className="card-diner p-4">
      <div className="flex items-center gap-2 mb-1">
        <Tag size={15} className="text-muted-foreground" />
        <h3 className="font-heading text-base text-obsidian-roast">Win-back codes</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Online checkout only, never the register. A code left off is refused; one switched on works until its expiry.
      </p>
      <div className="space-y-2">
        {codes.map((promo) => (
          <div
            key={promo.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-heading text-sm text-obsidian-roast">{promo.code}</p>
              <p className="text-xs text-muted-foreground">
                {promo.percent_off}% off · ${Number(promo.min_subtotal || 0).toFixed(2)} minimum
                {promo.expires_at
                  ? ` · expires ${new Date(promo.expires_at).toLocaleDateString()}`
                  : ' · no expiry'}
                {` · used ${Number(promo.times_redeemed || 0)}`}
              </p>
            </div>
            <button
              onClick={() => toggle(promo)}
              disabled={busy === promo.id}
              className={`px-3 py-1.5 rounded-full text-xs font-heading whitespace-nowrap transition-colors disabled:opacity-60 ${
                promo.is_active
                  ? 'bg-patina-mint text-white'
                  : 'bg-muted text-muted-foreground hover:bg-gray-200'
              }`}
            >
              {promo.is_active ? 'Live' : 'Off'}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}