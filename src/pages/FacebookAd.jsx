import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Check, Copy, MapPin, Phone, ThumbsUp, Share, MessageCircle } from 'lucide-react';

const PAGE_URL = 'https://flavorisle.com';
const ADDRESS = '103 N Main St, Smiths Grove, KY 42171';
const PHONE = '(270) 563-4618';

const PRIMARY_TEXT =
  `Hand-patted burgers. Real-ice-cream shakes. Pies baked every morning. 🍔🥤

That's the Flavor Isle promise — fresh, never-frozen food served right in the heart of Smiths Grove, KY.

📍 ${ADDRESS}
📞 ${PHONE}

Pull up a stool and stay a while. We're open every day — see you soon!`;

const HEADLINE = 'Flavor Isle — Smiths Grove, KY';
const DESCRIPTION =
  'Fresh hand-patted burgers, thick shakes, & homemade pies. Dine-in, pickup, or delivery.';
const LINK_DESCRIPTION = 'flavorisle.com';

const AD_IMAGE = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/a1519046a_generated_image.png';

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
          <h1 className="font-heading text-4xl text-obsidian-roast mb-3">Facebook Ad — Store Visits</h1>
          <p className="font-body text-muted-foreground max-w-xl mx-auto">
            A ready-to-paste creative promoting Flavor Isle and driving people to the Smiths Grove location.
            Copy each field into the matching box in Facebook Ads Manager.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Live Ad Preview ── */}
          <div>
            <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3">Ad Preview</p>
            <div className="bg-white rounded-2xl shadow-float overflow-hidden max-w-md mx-auto">
              {/* Ad header */}
              <div className="flex items-center gap-3 p-4">
                <img
                  src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png"
                  alt="Flavor Isle"
                  className="w-12 h-12 rounded-full object-contain bg-vanilla-malt flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast leading-tight">Flavor Isle</p>
                  <p className="text-xs text-muted-foreground">Sponsored · <span className="inline-flex items-center"><MapPin size={10} className="mr-0.5" />Smiths Grove, KY</span></p>
                </div>
              </div>

              {/* Primary text */}
              <div className="px-4 pb-3">
                <p className="font-body text-sm text-obsidian-roast whitespace-pre-line leading-relaxed">{PRIMARY_TEXT}</p>
              </div>

              {/* Media */}
              <div className="aspect-square w-full bg-muted">
                <img src={AD_IMAGE} alt="Flavor Isle" className="w-full h-full object-cover" />
              </div>

              {/* Link block */}
              <div className="flex items-center justify-between px-4 py-3 bg-vanilla-malt border-t border-border">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{LINK_DESCRIPTION}</p>
                  <p className="font-heading text-base text-obsidian-roast leading-tight truncate">{HEADLINE}</p>
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{DESCRIPTION}</p>
                </div>
                <span className="text-xs font-heading uppercase tracking-wider bg-patina-mint text-white px-4 py-2 rounded-md flex-shrink-0">
                  Get Directions
                </span>
              </div>

              {/* Engagement bar */}
              <div className="flex items-center justify-around px-4 py-2 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><ThumbsUp size={14} /> Like</span>
                <span className="flex items-center gap-1.5"><MessageCircle size={14} /> Comment</span>
                <span className="flex items-center gap-1.5"><Share size={14} /> Share</span>
              </div>
            </div>
          </div>

          {/* ── Copyable Ad Fields ── */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-float p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">Primary Text</p>
                <CopyButton text={PRIMARY_TEXT} label="Copy" />
              </div>
              <p className="font-body text-sm text-obsidian-roast whitespace-pre-line leading-relaxed bg-vanilla-malt rounded-xl p-3">
                {PRIMARY_TEXT}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Goes in the "Text" box. Keep under ~125 characters so it doesn't get cut off on mobile.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-float p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">Headline</p>
                <CopyButton text={HEADLINE} label="Copy" />
              </div>
              <p className="font-heading text-lg text-obsidian-roast bg-vanilla-malt rounded-xl p-3">{HEADLINE}</p>
              <p className="text-xs text-muted-foreground mt-2">Short, bold line under the image. Max 40 characters.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-float p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">Description</p>
                <CopyButton text={DESCRIPTION} label="Copy" />
              </div>
              <p className="font-body text-sm text-obsidian-roast bg-vanilla-malt rounded-xl p-3">{DESCRIPTION}</p>
              <p className="text-xs text-muted-foreground mt-2">Supporting line under the headline. Max 30 characters.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-float p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">Ad Image</p>
                <a href={AD_IMAGE} target="_blank" rel="noopener noreferrer" className="text-xs font-heading uppercase tracking-widest text-patina-mint hover:underline">Open</a>
              </div>
              <img src={AD_IMAGE} alt="Ad hero" className="w-full aspect-square object-cover rounded-xl" />
              <p className="text-xs text-muted-foreground mt-2">Recommended 1080 × 1080 (1:1). Right-click to save and upload to Ads Manager.</p>
            </div>

            <div className="bg-patina-mint/10 rounded-2xl p-5 border border-patina-mint/20">
              <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-2">Recommended Setup</p>
              <ul className="text-sm text-obsidian-roast space-y-1.5 leading-relaxed">
                <li>• <strong>Objective:</strong> Store traffic / Reach</li>
                <li>• <strong>Call-to-action:</strong> Get Directions</li>
                <li>• <strong>Audience:</strong> 10–25 miles around Smiths Grove, KY</li>
                <li>• <strong>Destination URL:</strong> {PAGE_URL} (or your store-locator page)</li>
                <li>• <strong>Phone:</strong> {PHONE}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}