// Facebook-post-ready version of the Tasty Threads $19.99 tee promo pop-up:
// live post preview plus copyable caption, links, and the two shirt photos.
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { MapPin, ThumbsUp, Share, MessageCircle, ExternalLink } from 'lucide-react';
import CopyTextButton from '@/components/marketing/CopyTextButton';

const SHOP_URL = 'https://crave.flavor-isle.com/merch';

const SHIRTS = [
  {
    id: 462593857,
    name: 'All You Need is Flavor Isle',
    image: 'https://files.cdn.printful.com/files/196/1969f01ea3bcd65b3ee5d20ee0897ca5_preview.png',
  },
  {
    id: 462577528,
    name: "Feed Me Flavor Isle & Tell Me I'm Pretty",
    image: 'https://files.cdn.printful.com/files/e3e/e3e9215aebc273152926012ae11e2a1d_preview.png',
  },
];

const CAPTION = `NEW TASTY THREADS — just $19.99! 👕🍔

Two fresh tees, hot off the press:
• "All You Need is Flavor Isle"
• "Feed Me Flavor Isle and Tell Me I'm Pretty"

Soft, comfy, and printed to order in your size and color. Wear the flavor, Smiths Grove. 💙❤️

🛒 Shop now: ${SHOP_URL}

Tag a friend who needs one. 👇`;

const SHORT_CAPTION = `New Tasty Threads tees — $19.99 each! 👕 "All You Need is Flavor Isle" and "Feed Me Flavor Isle and Tell Me I'm Pretty." Shop now: ${SHOP_URL}`;

function Panel({ title, action, children, note }) {
  return (
    <div className="bg-white rounded-2xl shadow-float p-5">
      <div className="flex items-center justify-between mb-3 gap-3">
        <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">{title}</p>
        {action}
      </div>
      {children}
      {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
    </div>
  );
}

export default function TastyThreadsAd() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Marketing Toolkit</p>
          <h1 className="font-heading text-4xl text-obsidian-roast mb-3">Facebook Post — Tasty Threads Tees</h1>
          <p className="font-body text-muted-foreground max-w-xl mx-auto">
            The $19.99 tee promo, ready to paste onto the Flavor Isle Facebook page.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Live post preview ── */}
          <div>
            <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3">Post Preview</p>
            <div className="bg-white rounded-2xl shadow-float overflow-hidden max-w-md mx-auto">
              <div className="flex items-center gap-3 p-4">
                <img
                  src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png"
                  alt="Flavor Isle"
                  className="w-12 h-12 rounded-full object-contain bg-vanilla-malt flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast leading-tight">Flavor Isle</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={10} />Smiths Grove, KY · Just now
                  </p>
                </div>
              </div>

              <div className="px-4 pb-3">
                <p className="font-body text-sm text-obsidian-roast whitespace-pre-line leading-relaxed">{CAPTION}</p>
              </div>

              {/* Two-photo grid, the way Facebook renders a 2-image post */}
              <div className="grid grid-cols-2 gap-0.5 bg-muted">
                {SHIRTS.map(s => (
                  <div key={s.id} className="aspect-square bg-white">
                    <img src={s.image} alt={`${s.name} tee`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-vanilla-malt border-t border-border">
                <div className="w-10 h-10 rounded-lg bg-midnight-cherry flex items-center justify-center flex-shrink-0">
                  <ExternalLink size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast leading-tight truncate">
                    crave.flavor-isle.com/merch
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug truncate">
                    Tasty Threads · Tees from $19.99 · Ships to your door
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-around px-4 py-2 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><ThumbsUp size={14} /> Like</span>
                <span className="flex items-center gap-1.5"><MessageCircle size={14} /> Comment</span>
                <span className="flex items-center gap-1.5"><Share size={14} /> Share</span>
              </div>
            </div>
          </div>

          {/* ── Copyable pieces ── */}
          <div className="space-y-5">
            <Panel
              title="Post Caption"
              action={<CopyTextButton text={CAPTION} />}
              note='Paste into the "What&apos;s on your mind?" composer on your Facebook page.'
            >
              <p className="font-body text-sm text-obsidian-roast whitespace-pre-line leading-relaxed bg-vanilla-malt rounded-xl p-3">
                {CAPTION}
              </p>
            </Panel>

            <Panel
              title="Short Version (Stories / Instagram)"
              action={<CopyTextButton text={SHORT_CAPTION} />}
            >
              <p className="font-body text-sm text-obsidian-roast leading-relaxed bg-vanilla-malt rounded-xl p-3">
                {SHORT_CAPTION}
              </p>
            </Panel>

            <Panel title="Shirt Photos" note="Right-click each photo to save, then attach both to the post.">
              <div className="grid grid-cols-2 gap-3">
                {SHIRTS.map(s => (
                  <div key={s.id}>
                    <img
                      src={s.image}
                      alt={`${s.name} tee`}
                      className="w-full aspect-square object-cover rounded-xl bg-white"
                    />
                    <p className="font-heading text-xs text-obsidian-roast mt-1.5 leading-tight">{s.name}</p>
                    <a
                      href={s.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-heading uppercase tracking-widest text-patina-mint hover:underline"
                    >
                      Open
                    </a>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Direct Product Links">
              <div className="space-y-3">
                {SHIRTS.map(s => {
                  const link = `${SHOP_URL}?product=${s.id}`;
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 bg-vanilla-malt rounded-xl p-3">
                      <div className="min-w-0">
                        <p className="font-heading text-xs text-obsidian-roast leading-tight">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{link}</p>
                      </div>
                      <CopyTextButton text={link} label="Copy" />
                    </div>
                  );
                })}
              </div>
            </Panel>

            <div className="bg-patina-mint/10 rounded-2xl p-5 border border-patina-mint/20">
              <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-2">Posting Tips</p>
              <ul className="text-sm text-obsidian-roast space-y-1.5 leading-relaxed">
                <li>• Post from the <strong>Flavor Isle</strong> page, then share to local community groups.</li>
                <li>• Upload both shirt photos so Facebook shows the side-by-side grid.</li>
                <li>• Drop the direct product links in the first comment for one-tap shopping.</li>
                <li>• Ask "which one are you grabbing?" — comments boost reach more than likes.</li>
                <li>• Pin it for the week while the $19.99 price is running.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}