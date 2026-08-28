import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Check, Copy, ExternalLink, Utensils, Facebook, Instagram } from 'lucide-react';

// The website the "Order Food" button sends followers to. Square connects
// this automatically once your Facebook/Instagram profiles are linked.
const ORDER_URL = 'https://crave.flavor-isle.com';
const FACEBOOK_PAGE = 'https://facebook.com/flavorisle';
const SQUARE_DASHBOARD = 'https://squareup.com/dashboard';
const SQUARE_HELP = 'https://squareup.com/help/us/en/article/7778-add-food-ordering-buttons-to-facebook-and-instagram-with-square-online';
const FB_ACTION_BUTTON_HELP = 'https://www.facebook.com/help/977869848936797';
const IG_ORDER_HELP = 'https://help.instagram.com/661624171320775/?helpref=related_articles';

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

const PREREQS = [
  'Your website (online ordering) must already be set up and live.',
  'You need a Facebook or Instagram business profile — personal accounts won\'t work.',
  'Review and follow the Facebook commerce policies and guidelines.',
  'You must be the account owner or a team member with online permissions in Square Dashboard.',
];

const STEPS = [
  {
    title: 'Step 1 — Connect Square to Facebook',
    body: 'Sign in to Square Dashboard and go to Channels → Facebook Food Ordering. You\'ll be prompted to log in to Facebook. Approve the connection, grant Square permission to manage food ordering, then choose the Facebook and/or Instagram profile you want to link and follow the prompts. Optionally click "Create Ad" to pick an ad account, then click Done.',
  },
  {
    title: 'Step 2 — Install the Facebook Pixel',
    body: 'Go to Facebook Pixel, click Get Started, and follow the instructions. The Pixel lets you track orders that come from your Facebook and Instagram buttons so you can measure what\'s working.',
  },
  {
    title: 'Step 3 — Manage "Order Food" buttons',
    body: 'Once your profiles are linked, the "Order Food" buttons are added to your Facebook and Instagram pages automatically. To manage or remove them later, go back to Square Dashboard → Channels → Facebook Food Ordering and click "Connect Facebook account".',
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
            <Facebook size={12} /> Square × Facebook & Instagram
          </div>
          <h1 className="font-heading text-4xl text-obsidian-roast mb-3">Add "Order Food" Buttons to Facebook & Instagram</h1>
          <p className="font-body text-muted-foreground max-w-xl mx-auto">
            Connect Square to your social profiles so an "Order Food" button appears on your Facebook page and Instagram — tapping it sends followers straight to your online menu.
          </p>
        </div>

        {/* Before you begin */}
        <div className="bg-white rounded-2xl shadow-float p-5 mb-8">
          <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-3">Before You Begin</p>
          <ul className="space-y-2">
            {PREREQS.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-obsidian-roast leading-relaxed">
                <Check size={16} className="flex-shrink-0 mt-0.5 text-midnight-cherry" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Order URL card */}
        <div className="bg-white rounded-2xl shadow-float p-5 mb-8">
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <p className="text-xs font-heading uppercase tracking-widest text-patina-mint flex items-center gap-2">
              <Utensils size={12} /> Your Website (Order Destination)
            </p>
            <CopyButton text={ORDER_URL} label="Copy Link" />
          </div>
          <p className="font-body text-sm text-obsidian-roast bg-vanilla-malt rounded-xl p-3 break-all">{ORDER_URL}</p>
          <p className="text-xs text-muted-foreground mt-2">Square points the "Order Food" button here automatically once your profiles are linked.</p>
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

        {/* Disconnect note + links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-patina-mint/10 rounded-2xl p-5 border border-patina-mint/20">
            <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-2">Good to Know</p>
            <ul className="text-sm text-obsidian-roast space-y-1.5 leading-relaxed">
              <li>• New Square accounts can take a few days before they can connect to Facebook.</li>
              <li>• To switch Facebook accounts, disconnect and reconnect from Square Dashboard.</li>
              <li>• You can also add "Order Food" stickers to Instagram stories.</li>
              <li>• Buttons can take a few minutes to appear for visitors on mobile.</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-float p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-2">Start in Square Dashboard</p>
              <p className="font-body text-sm text-muted-foreground mb-4">Open Channels → Facebook Food Ordering to begin the connection.</p>
            </div>
            <a
              href={SQUARE_DASHBOARD}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-mint chrome-hover px-5 py-3 text-sm font-heading inline-flex items-center justify-center gap-2"
            >
              Open Square Dashboard <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Helpful links */}
        <div className="bg-white rounded-2xl shadow-float p-5">
          <p className="text-xs font-heading uppercase tracking-widest text-patina-mint mb-3">Helpful Links</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href={SQUARE_HELP} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-obsidian-roast hover:text-midnight-cherry transition-colors">
              <ExternalLink size={14} /> Square: full setup guide
            </a>
            <a href={FB_ACTION_BUTTON_HELP} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-obsidian-roast hover:text-midnight-cherry transition-colors">
              <Facebook size={14} /> Add an action button (Facebook)
            </a>
            <a href={IG_ORDER_HELP} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-obsidian-roast hover:text-midnight-cherry transition-colors">
              <Instagram size={14} /> Add "Order Food" to Instagram
            </a>
            <a href={FACEBOOK_PAGE} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-obsidian-roast hover:text-midnight-cherry transition-colors">
              <Facebook size={14} /> Flavor Isle Facebook page
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}