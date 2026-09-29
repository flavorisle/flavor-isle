import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Check, Copy, MapPin, Phone, ThumbsUp, Share, MessageCircle } from 'lucide-react';
import { optimizedImageUrl } from '@/lib/utils';

const ORDER_URL = 'https://flavor-isle.com';
const ADDRESS = '103 N Main St, Smiths Grove, KY 42171';
const PHONE = '(270) 563-4618';
const HOURS = 'Mon–Sat 11am–9pm · Sun 12pm–7pm';

const CAPTION =
  `Hand-patted burgers. Real-ice-cream shakes. 🍔🥤

That's the Flavor Isle promise — fresh, never-frozen food served right in the heart of Smiths Grove, KY. Dine-in, takeout, or delivery — your call.

📍 ${ADDRESS}
📞 ${PHONE}
🛒 Order online: ${ORDER_URL}

Open ${HOURS}. Come see us!`;

const POST_IMAGE = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/5dbcfe508_20260702_010942000_iOS.jpg';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={onCopy}
      className="flex items-center gap-2 text-xs font-heading uppercase tracking-widest px-3 py-1.5 rounded-full bg-midnight-cherry text-white hover:opacity-90 transition-opacity"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export default function FacebookAd() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Marketing Toolkit</p>
          <h1 className="font-heading text-4xl text-obsidian-roast mb-3">Facebook Post — Flavor Isle</h1>
          <p className="font-body text-muted-foreground max-w-xl mx-auto">
            A ready-to-paste post to share on the Flavor Isle Facebook page and drive visits to the Smiths Grove location.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Live Post Preview ── */}
          <div>
            <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3">Post Preview</p>
            <div className="bg-white rounded-2xl shadow-float overflow-hidden max-w-md mx-auto">
              {/* Post header */}
              <div className="flex items-center gap-3 p-4">
                <img
                  src={optimizedImageUrl('https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png', 200, 200, 'fit')}
                  alt="Flavor Isle"
                  width="200"
                  height="200"
                  className="w-12 h-12 rounded-xl object-contain bg-vanilla-malt flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast leading-tight">Flavor Isle</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} />Smiths Grove, KY · Just now</p>
                </div>
              </div>

              {/* Caption */}
              <div className="px-4 pb-3">
                <p className="font-body text-sm text-obsidian-roast whitespace-pre-line leading-relaxed">{CAPTION}</p>
              </div>

              {/* Photo */}
              <div className="aspect-square w-full bg-muted">
                <img src={optimizedImageUrl(POST_IMAGE, 800, 800)} alt="Flavor Isle storefront" width="800" height="800" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>

              {/* Link row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-vanilla-malt border-t border-border">
                <div className="w-10 h-10 rounded-lg bg-patina-mint flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast leading-tight truncate">{ORDER_URL.replace(/^https?:\/\//, '')}</p>
                  <p className="text-xs text-muted-foreground leading-snug truncate">Order online · Dine-in · Takeout · Delivery</p>
                </div>
              </div>

              {/* Engagement bar */}
              <div className="flex items-center justify-around px-4 py-2 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><ThumbsUp size={14} /> Like</span>
                <span className="flex items-center gap-1.5"><MessageCircle size={14} /> Comment</span>
                <span className="flex items-center gap-1.5"><Share size={14} /> Share</span>
              </div>
            </div>
          </div>

          {/* ── Copyable Fields ── */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-float p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">Post Caption</p>
                <CopyButton text={CAPTION} label="Copy" />
              </div>
              <p className="font-body text-sm text-obsidian-roast whitespace-pre-line leading-relaxed bg-vanilla-malt rounded-xl p-3">
                {CAPTION}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Paste into the "What's on your mind?" composer on your Facebook page.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-float p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">Photo</p>
                <a href={POST_IMAGE} target="_blank" rel="noopener noreferrer" className="text-xs font-heading uppercase tracking-widest text-patina-mint hover:underline">Open</a>
              </div>
              <img src={optimizedImageUrl(POST_IMAGE, 800, 800)} alt="Flavor Isle storefront" width="800" height="800" loading="lazy" decoding="async" className="w-full aspect-square object-cover rounded-xl" />
              <p className="text-xs text-muted-foreground mt-2">Right-click to save (or use the original photo on your phone), then attach it to the post.</p>
            </div>

            <div className="bg-patina-mint/10 rounded-2xl p-5 border border-patina-mint/20">
              <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-2">Posting Tips</p>
              <ul className="text-sm text-obsidian-roast space-y-1.5 leading-relaxed">
                <li>• Post from the <strong>Flavor Isle</strong> Facebook page (facebook.com/flavorisle), not a personal profile.</li>
                <li>• Tag the post with the location <strong>Smiths Grove, KY</strong> so nearby people find it.</li>
                <li>• Best times: late morning (10–11am) or late afternoon (4–5pm) when people plan meals.</li>
                <li>• Pin it to the top of the page so new visitors see it first.</li>
                <li>• Drop the order link in the first comment too — Facebook surfaces posts with links higher in the feed.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}