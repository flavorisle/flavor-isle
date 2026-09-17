import React from 'react';
import { Printer, MapPin, Phone, Clock, Globe, UtensilsCrossed, IceCream2, Flame } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';
const BUILDING = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7b759012a_FlavorIsleBuilding.png';

export default function Flyer() {
  return (
    <>
      <style>{`
        @media print {
          @page { size: letter portrait !important; margin: 0.25in !important; }
          html, body { background: #ffffff !important; }
          /* Hide every element on the page, then reveal only the flyer sheet. */
          body * { visibility: hidden !important; }
          .flyer-no-print { display: none !important; }
          #flyer-wrap {
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          #flyer-sheet, #flyer-sheet * { visibility: visible !important; }
          #flyer-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          #flyer-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Floating print button — hidden when printing */}
      <div className="flyer-no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="btn-cherry chrome-hover px-5 py-3 text-sm font-heading flex items-center gap-2 shadow-float-lg"
        >
          <Printer size={18} /> Print Flyer
        </button>
      </div>

      {/* Flyer sheet — 8.5x11 letter proportions */}
      <div id="flyer-wrap" className="min-h-screen flex items-start justify-center bg-vanilla-malt p-4 sm:p-8">
        <div
          id="flyer-sheet"
          className="bg-white rounded-2xl shadow-float-lg overflow-hidden flex flex-col"
          style={{ width: '8.5in', maxWidth: '100%', minHeight: '11in' }}
        >
          {/* Top brand band */}
          <div className="bg-patina-mint text-white px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={LOGO} alt="Flavor Isle logo" className="w-14 h-14 object-contain rounded-xl bg-white/95 p-1" />
              <div>
                <div className="font-heading text-3xl leading-none tracking-wide">FLAVOR ISLE</div>
                <div className="text-xs tracking-[0.3em] text-white/80 mt-1">BURGERS &middot; SHAKES &middot; SIDES</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-heading text-lg text-smashie-yellow leading-none">EST. 1964</div>
              <div className="text-[10px] tracking-widest text-white/80 mt-1">SMITHS GROVE, KY</div>
            </div>
          </div>

          {/* Building illustration */}
          <div className="bg-patina-mint/5 px-8 pt-8 pb-2 flex justify-center">
            <img
              src={BUILDING}
              alt="Flavor Isle roadside stand"
              className="w-full max-w-[5.5in] object-contain"
            />
          </div>

          {/* Headline */}
          <div className="px-8 pt-4 text-center">
            <h1 className="font-heading text-4xl text-obsidian-roast leading-tight">
              FRESH HAND-PATTED BURGERS <span className="text-midnight-cherry">&</span> THICK SHAKES
            </h1>
            <p className="font-body text-base text-muted-foreground mt-2">
              Smiths Grove's favorite roadside stop — hand-patted, never frozen, made to order.
            </p>
          </div>

          {/* Feature trio */}
          <div className="px-8 py-6 grid grid-cols-3 gap-4">
            {[
              { icon: Flame, title: 'Fresh Hand-Patted Burgers', sub: 'Hand-patted, never frozen, made to order' },
              { icon: UtensilsCrossed, title: 'Hot Sides', sub: 'Crispy fries, tots & more' },
              { icon: IceCream2, title: 'Thick Shakes', sub: 'Hand spun. Custom flavors' },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-2">
                  <f.icon size={22} className="text-midnight-cherry" />
                </div>
                <div className="font-heading text-lg text-obsidian-roast leading-none">{f.title}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{f.sub}</div>
              </div>
            ))}
          </div>

          {/* Menu highlights */}
          <div className="px-8 pb-2">
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  name: 'Double Cheeseburger',
                  desc: 'Twice the patties, twice the cheese. Built fresh by hand, stacked high with big burger energy.',
                  price: '$9.50',
                  img: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/1b6e0909b1fdbe33d4e2df41b1e87aee97b3f99a/500x500.jpeg',
                },
                {
                  name: 'French Fries',
                  desc: '(Crinkle-Cut) — Crisp crinkle edges with a fluffy center — the classic fry bite. (Original 1964)',
                  price: '$3.25',
                  img: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/4e92f3bb902bfa24b9bc258513d0b8b7396edfa0/500x500.jpeg',
                },
                {
                  name: 'Banana Pudding Bliss Milkshake',
                  desc: 'Banana pudding turned shake — creamy, nostalgic comfort.',
                  price: '$5.99',
                  img: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/bc5ca3ebadbb5e4ac86c3782d0c4d4d58cc2d693/500x500.jpeg',
                },
              ].map((m) => (
                <div key={m.name} className="rounded-2xl overflow-hidden border border-patina-mint/15 bg-patina-mint/5">
                  <div className="h-28 overflow-hidden">
                    <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-heading text-base text-obsidian-roast leading-none">{m.name}</div>
                      <div className="font-heading text-base text-midnight-cherry leading-none">{m.price}</div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* More on the menu */}
          <div className="px-8 pb-2 text-center">
            <p className="text-[11px] text-obsidian-roast/80 leading-snug">
              <span className="font-heading tracking-wide">PLUS:</span> Mini Cheeseburger &middot; Tenderloin &middot; Chuck Wagon &middot; Curly Fries &middot; Sweet Potato Fries &middot; Bacon Cheeseburger &middot; Cheeseburger &middot; Loaded Cajun Chili Fries &middot; Shakes &amp; more!
            </p>
          </div>

          {/* CTA band */}
          <div className="mx-8 bg-midnight-cherry text-white rounded-2xl px-6 py-5 flex items-center justify-between">
            <div>
              <div className="font-heading text-2xl leading-none">ORDER ONLINE</div>
              <div className="text-sm text-white/90 mt-1">Pickup &middot; Delivery &middot; Dine-In</div>
            </div>
            <div className="text-right">
              <div className="font-heading text-xl text-smashie-yellow leading-none">flavor-isle.com</div>
              <div className="text-sm text-white/90 mt-1">(270) 563-4618</div>
            </div>
          </div>

          {/* Info row */}
          <div className="px-8 py-6 grid grid-cols-3 gap-4 text-obsidian-roast">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-midnight-cherry flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-snug">
                <div className="font-heading text-sm">FIND US</div>
                103 N Main St<br />Smiths Grove, KY 42171
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={16} className="text-midnight-cherry flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-snug">
                <div className="font-heading text-sm">HOURS</div>
                Open Daily<br />11 AM – 8 PM
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone size={16} className="text-midnight-cherry flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-snug">
                <div className="font-heading text-sm">CALL AHEAD</div>
                (270) 563-4618
              </div>
            </div>
          </div>

          {/* Footer band */}
          <div className="mt-auto bg-obsidian-roast text-white px-8 py-4 text-center">
            <div className="font-heading text-lg tracking-wide text-smashie-yellow">SEE YOU AT THE ISLE!</div>
            <div className="text-[10px] tracking-widest text-white/70 mt-1 flex items-center justify-center gap-1">
              <Globe size={10} /> flavor-isle.com &nbsp;&middot;&nbsp; @flavor_isle
            </div>
          </div>
        </div>
      </div>
    </>
  );
}