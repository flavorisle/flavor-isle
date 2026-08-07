import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, RefreshCw, UserPlus, X, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DISMISS_KEY = 'fi-signup-nudge-dismissed';

// Non-intrusive nudge that advertises creating an account to save orders,
// earn Star Rewards, and reorder easily. Only renders for guests who aren't
// signed in. The compact variant respects a localStorage dismissal; the
// featured variant (order confirmation) always shows — it's a high-intent
// moment worth the pitch even if the slim banner was dismissed elsewhere.
export default function SignUpNudge({ variant = 'compact' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (variant === 'compact' && localStorage.getItem(DISMISS_KEY)) return;
    base44.auth.isAuthenticated()
      .then((authed) => { if (!authed) setVisible(true); })
      .catch(() => setVisible(true));
  }, [variant]);

  const dismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  if (variant === 'featured') {
    return (
      <div className="card-diner p-6 text-left bg-gradient-to-br from-patina-mint/5 to-smashie-yellow/10 border border-patina-mint/20">
        <button onClick={dismiss} className="float-right text-muted-foreground hover:text-obsidian-roast transition-colors -m-1 p-1">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 bg-smashie-yellow/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Star size={22} className="text-smashie-yellow" fill="currentColor" />
          </div>
          <div>
            <h3 className="font-heading text-xl text-obsidian-roast leading-none">Create an account to save your order history</h3>
            <p className="text-xs text-muted-foreground mt-1">Track your Star Rewards loyalty points — it takes 30 seconds.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { icon: RefreshCw, label: 'Order History', desc: 'See every past order' },
            { icon: Gift, label: 'Track Rewards', desc: 'Watch your Stars add up' },
            { icon: UserPlus, label: 'Easy Reorder', desc: 'One tap to repeat' },
          ].map((b) => (
            <div key={b.label} className="text-center bg-white/60 rounded-2xl p-3">
              <b.icon size={18} className="text-midnight-cherry mx-auto mb-1" />
              <p className="font-heading text-xs text-obsidian-roast">{b.label}</p>
              <p className="text-xs text-muted-foreground leading-tight">{b.desc}</p>
            </div>
          ))}
        </div>
        <Link
          to="/register"
          className="btn-cherry chrome-hover w-full py-3.5 text-sm font-heading flex items-center justify-center gap-2"
        >
          <UserPlus size={16} /> Create Free Account
        </Link>
        <p className="text-xs text-muted-foreground text-center mt-2">Your phone number tracks your Star Rewards</p>
      </div>
    );
  }

  // compact — slim dismissible banner
  return (
    <div className="flex items-center gap-3 bg-patina-mint/8 border border-patina-mint/15 rounded-2xl px-4 py-3">
      <Star size={18} className="text-smashie-yellow flex-shrink-0" fill="currentColor" />
      <p className="text-xs text-obsidian-roast flex-1 leading-snug">
        <span className="font-heading">Earn Star Rewards!</span>{' '}
        <Link to="/register" className="text-midnight-cherry underline hover:no-underline">Create an account</Link>{' '}
        to save orders &amp; reorder fast.
      </p>
      <button onClick={dismiss} className="text-muted-foreground hover:text-obsidian-roast flex-shrink-0 -m-1 p-1">
        <X size={14} />
      </button>
    </div>
  );
}