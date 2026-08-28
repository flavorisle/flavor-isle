import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Check, Copy, ExternalLink, Utensils, Facebook } from 'lucide-react';

// The URL customers reach when they tap "Order Food" on the Facebook page.
// Matches the order URL used across the marketing toolkit.
const ORDER_URL = 'https://crave.flavor-isle.com';
const FACEBOOK_PAGE = 'https://facebook.com/flavorisle';

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

const STEPS = [
  {
    title: 'Open your Facebook Page settings',
    body: 'Go to the Flavor Isle Facebook page on desktop and make sure you\'re logged in as an admin. Tap "Edit Page" (or the ••• menu → Edit Page on mobile).',
  },
  {
    title: 'Add an Action Button',
    body: 'In the left menu choose "Action Button" (also called "Add a Button"). Pick the "Order Food" or "Order Now" option from the list of button types.',
  },
  {
    title: 'Paste your order link',
    body: 'When Facebook asks for the website URL, paste the Flavor Isle order link below. This is the page customers land on when they tap the button.',
  },
  {
    title: 'Finish and test',
    body: 'Save the button, then view your page as a visitor and tap "Order Food" to confirm it opens the online menu. It can take a few minutes to appear for everyone.',
  },
];

export default function FacebookOrderFood() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-patina-mint/10 text-patina-mint px-4 py-1.5 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
            <Facebook size={12} /> Facebook Setup
          </div>
          <h1 className="font-heading text-4xl text-obsidian-roast mb-3">Add an "Order Food" Button on Facebook</h1>
          <p className="font-body text-muted-foreground max-w-xl mx-auto">
            Walk through these steps once to turn your Facebook page's button into a one-tap link straight to the Flavor Isle online menu.
          </p>
        </div>

        {/* Order URL card */}
        <div className="bg-white rounded-2xl shadow-float p-5 mb-8">
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <p className="text-xs font-heading uppercase tracking-widest text-patina-mint flex items-center gap-2">
              <Utensils size={12} /> Your Order Link
            </p>
            <CopyButton text={ORDER_URL} label="Copy Link" />
          </div>
          <p className="font-body text-sm text-obsidian-roast bg-vanilla-malt rounded-xl p-3 break-all">{ORDER_URL}</p>
          <p className="text-xs text-muted-foreground mt-2">Paste this exact URL when Facebook asks for the website to link the button to.</p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {STEPS.map((step, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-float p-5 flex gap-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-midnight-cherry text-white flex items-center justify-center font-heading text-sm">
                {idx + 1}
              </div>
              <div>
                <p className="font-heading text-base text-obsidian-roast mb-1">{step.title}</p>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tips + links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-patina-mint/10 rounded-2xl p-5 border border-patina-mint/20">
            <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-2">Good to Know</p>
            <ul className="text-sm text-obsidian-roast space-y-1.5 leading-relaxed">
              <li>• You must be an admin of the Facebook page to add or change the button.</li>
              <li>• "Order Food" may be listed under "Order Now" depending on your page category — both work the same.</li>
              <li>• Updates can take a few minutes to show up for visitors on mobile.</li>
              <li>• Keep the link pointed at the order page so it never breaks.</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-float p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-2">Open Your Page</p>
              <p className="font-body text-sm text-muted-foreground mb-4">Jump straight to the Flavor Isle Facebook page to start editing the button.</p>
            </div>
            <a
              href={FACEBOOK_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-mint chrome-hover px-5 py-3 text-sm font-heading inline-flex items-center justify-center gap-2"
            >
              <Facebook size={16} /> Go to Facebook Page <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}