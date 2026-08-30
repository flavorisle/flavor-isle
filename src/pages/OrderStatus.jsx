import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import OrderLookup from '@/components/OrderLookup';
import { PackageSearch } from 'lucide-react';

export default function OrderStatus() {
  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Navbar />

      {/* Header */}
      <div className="bg-obsidian-roast text-white py-10 px-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 mb-4">
          <PackageSearch size={26} className="text-smashie-yellow" />
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl mb-2">Track Your Order</h1>
        <p className="font-body text-white/80 text-sm sm:text-base max-w-md mx-auto">
          Drop in your order number and we'll show you exactly where your food's at — from the grill to the bag.
        </p>
      </div>

      {/* Lookup + status tracker */}
      <div className="px-4 py-10">
        <OrderLookup />
      </div>

      <Footer />
      <CartDrawer />
    </div>
  );
}