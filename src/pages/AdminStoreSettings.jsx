import React from 'react';
import { Store } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';
import SiteNoticePanel from '@/components/admin/SiteNoticePanel';
import StoreStatusCard from '@/components/StoreStatusCard';
import StoreClosurePanel from '@/components/StoreClosurePanel';
import OrderCutoffSettings from '@/components/OrderCutoffSettings';
import BusinessHoursSettings from '@/components/BusinessHoursSettings';
import DeliveryPricingTiers from '@/components/admin/DeliveryPricingTiers';
import HappyHourPanel from '@/components/admin/HappyHourPanel';
import ExtraCookPanel from '@/components/admin/ExtraCookPanel';

// Consolidated store operations page: customer notice banner, online ordering
// toggle, emergency closures, order cutoffs + delivery pause, and business
// hours — all the "is the store open and how" controls in one place.
export default function AdminStoreSettings() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <AdminNav />

      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Store size={24} className="text-[hsl(var(--primary))]" />
          <div>
            <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))] mb-1">Admin</p>
            <h1 className="font-heading text-3xl text-white">Store Settings</h1>
            <p className="text-gray-300 mt-1 text-sm">Hours, closures, delivery, and customer notices — all in one place.</p>
          </div>
        </div>
      </div>

      <SiteNoticePanel />
      <StoreStatusCard />
      <StoreClosurePanel />
      <OrderCutoffSettings />
      <HappyHourPanel />
      <ExtraCookPanel />
      <BusinessHoursSettings />
      <DeliveryPricingTiers />
    </div>
  );
}