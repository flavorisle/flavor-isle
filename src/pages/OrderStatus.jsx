import React from 'react';
import { Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import OrderLookup from '@/components/OrderLookup';
import Seo from '@/components/Seo';

export default function OrderStatus() {
  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Order Status — Track Your Flavor Isle Order"
        description="Track your Flavor Isle order from grill to bag. Enter your order number to see live status updates for pickup, delivery, and dine-in."
      />
      <Navbar />

      <section className="px-4 sm:px-6 pt-8 pb-6 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading tracking-widest uppercase text-white mb-3 bg-midnight-cherry">
          <Search size={13} /> Order Status
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">
          WHERE'S MY FOOD?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-body mt-3 max-w-xl mx-auto">
          Drop in your order number and we'll show you exactly where your order is — from the grill to the bag.
        </p>
      </section>

      <section className="px-4 sm:px-6 pb-16">
        <OrderLookup />
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}