import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BellRing, ArrowRight, Smartphone } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import OrderAlertsOptIn from '@/components/OrderAlertsOptIn';

// Landing page for the "turn on order alerts" link in the confirmation email.
// Its whole job is to get an iPhone customer to the two taps that make order
// alerts possible, and to turn them on for everyone else.
export default function OrderAlerts() {
  const params = new URLSearchParams(useLocation().search);
  const orderNumber = params.get('order') || undefined;

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Order Alerts | Flavor Isle"
        description="Get a lock-screen notification when your Flavor Isle order hits the kitchen and the moment it's ready for pickup."
        ogTitle="Order Alerts | Flavor Isle"
        ogDescription="Your phone lights up when we get your order and again the moment it's ready. No app to download."
        ogImage="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png"
        ogImageAlt="Flavor Isle"
        path="/order-alerts"
      />
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-midnight-cherry/10 flex items-center justify-center mb-4">
            <BellRing size={24} className="text-midnight-cherry" />
          </div>
          <h1 className="font-heading text-3xl text-obsidian-roast leading-tight">Order alerts</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Your phone lights up when we get your order and again the moment it's ready. No app to download.
          </p>
        </div>

        <OrderAlertsOptIn orderNumber={orderNumber} />

        <div className="card-diner p-5 mt-4">
          <div className="flex items-start gap-3">
            <Smartphone size={17} className="text-patina-mint mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-heading text-base text-obsidian-roast">What you'll get</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>&bull; "Order #123456 received" the second it hits the kitchen</li>
                <li>&bull; "Order #123456 is ready for pickup" when it comes off the line</li>
                <li>&bull; Nothing else. No marketing blasts on this channel.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link to="/order-status" className="inline-flex items-center gap-2 text-sm font-heading text-midnight-cherry hover:underline">
            Check an order's live status <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
