import React from 'react';
import { Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';
import RecommendationEmailTester from '@/components/admin/RecommendationEmailTester';
import RecommendationEmailLog from '@/components/admin/RecommendationEmailLog';
import RecommendationEmailCandidates from '@/components/admin/RecommendationEmailCandidates';
import PromoEmailComposer from '@/components/admin/PromoEmailComposer';

export default function AdminEmails() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <AdminNav />

      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Mail size={24} className="text-[hsl(var(--primary))]" />
            <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">EMAIL CAMPAIGNS</p>
          </div>
          <h1 className="font-heading text-4xl text-white">Recommendation Emails</h1>
          <p className="text-gray-300 mt-3 max-w-2xl">
            Manage post-order recommendation emails. The scanner runs every 10 minutes and emails customers ~30 minutes after their order. Send a test, trigger a real send, or review what's gone out.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <PromoEmailComposer />
        <RecommendationEmailTester />
        <RecommendationEmailCandidates />
        <RecommendationEmailLog />
      </div>
    </div>
  );
}