import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Share2, Check, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';

// Start a group order (issue #356). The host names the group, adds their first
// name, picks when it closes, and gets one link to hand round.
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export default function GroupOrderStart() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    const inThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return { title: '', host_name: '', closes_at: toLocalInput(inThreeHours) };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.host_name.trim()) { setError('Add your first name.'); return; }
    if (!form.title.trim()) { setError('Give the group a name.'); return; }
    const closesAt = new Date(form.closes_at);
    if (Number.isNaN(closesAt.getTime())) { setError('Choose a time for the group to close.'); return; }
    setBusy(true);
    try {
      const res = await base44.functions.invoke('createGroupOrder', {
        title: form.title.trim(),
        host_name: form.host_name.trim(),
        closes_at: closesAt.toISOString(),
      });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || 'The group could not be started.');
      setInvite({ code: data.code, url: data.url });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'The group could not be started.');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!invite) return;
    const text = `${form.title.trim()} — add your items here`;
    try {
      if (navigator.share) {
        await navigator.share({ title: form.title.trim(), text, url: invite.url });
        return;
      }
    } catch { /* the customer closed the share sheet — fall through to copying */ }
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — the link is on screen to copy by hand */ }
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Group Order — One Ticket, One Payment | Flavor Isle"
        description="Start a group order at Flavor Isle: everyone adds their own items, one person pays, and the whole group collects on one pickup ticket."
      />
      <Navbar />
      <CartDrawer />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <p className="font-heading uppercase tracking-widest text-sm text-midnight-cherry mb-2">Group order</p>
          <h1 className="font-heading text-3xl sm:text-4xl text-obsidian-roast leading-tight">
            Everybody orders, one person pays
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Share one link. Each person adds their own items from the menu. It all lands on one pickup ticket, and one person pays for the group.
          </p>
        </div>

        {!invite ? (
          <form onSubmit={submit} className="card-diner p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Group name
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Friday lunch crew"
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Your first name
              </label>
              <input
                type="text"
                value={form.host_name}
                onChange={(e) => update('host_name', e.target.value)}
                placeholder="Wesley"
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Group closes
              </label>
              <input
                type="datetime-local"
                value={form.closes_at}
                onChange={(e) => update('closes_at', e.target.value)}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
              />
              <p className="text-xs text-muted-foreground mt-1">
                After this time nobody can add anything, and the items lock.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? 'Starting…' : (<><Users size={16} /> Start the group</>)}
            </button>
          </form>
        ) : (
          <div className="card-diner p-6 text-center space-y-4">
            <h2 className="font-heading text-2xl text-obsidian-roast">Your group is open</h2>
            <p className="text-sm text-muted-foreground">
              Send this link to everyone. They add their own items; you pay once for the lot.
            </p>
            <p className="text-sm font-mono break-all bg-muted rounded-xl px-3 py-3 text-obsidian-roast">{invite.url}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={share} className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading inline-flex items-center justify-center gap-2">
                {copied ? <><Check size={16} /> Link copied</> : <><Share2 size={16} /> Share the link</>}
              </button>
              <button
                onClick={() => navigate(`/group-order/${invite.code}`)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-heading rounded-full border-2 border-patina-mint text-patina-mint hover:bg-patina-mint hover:text-white transition-colors"
              >
                Open the group <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Pickup only. <Link to="/menu" className="underline">See the full menu</Link>
        </p>
      </div>

      <Footer />
    </div>
  );
}