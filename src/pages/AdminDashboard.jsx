import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, UtensilsCrossed, MessagesSquare, MessageSquareQuote, Receipt } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import LiveOrdersFeed from '@/components/LiveOrdersFeed';
import StoreStatusCard from '@/components/StoreStatusCard';
import OrderCutoffSettings from '@/components/OrderCutoffSettings';
import BusinessHoursSettings from '@/components/BusinessHoursSettings';
import AdminNav from '@/components/admin/AdminNav';
import BroadcastPushCard from '@/components/BroadcastPushCard';
import PushLogList from '@/components/PushLogList';
import StoreClosurePanel from '@/components/StoreClosurePanel';
import StoreMetrics from '@/components/admin/StoreMetrics';

const orderPages = [
{
  title: 'All Orders',
  description: 'Food, phone, POS & merch orders — unified in one place',
  icon: Receipt,
  path: '/admin/orders',
  color: 'midnight-cherry'
}];

const adminPages = [
{
  title: 'Menu Manager',
  description: 'Manage menu items, daily specials, and combo offers',
  icon: UtensilsCrossed,
  path: '/admin/menu',
  color: 'midnight-cherry'
},

{
  title: 'Communications',
  description: 'Phone log, SMS log, message log, and Smashie AI settings',
  icon: MessagesSquare,
  path: '/admin/communications',
  color: 'patina-mint'
},
{
  title: 'Reviews',
  description: 'Approve customer feedback to feature as testimonials on the home page',
  icon: MessageSquareQuote,
  path: '/admin/reviews',
  color: 'midnight-cherry'
}];


export default function AdminDashboard() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <AdminNav />

      {/* Hero */}
      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Settings size={24} className="text-[hsl(var(--primary))]" />
            <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">ADMINISTRATION</p>
          </div>
          <h1 className="font-heading text-4xl text-white">Admin Dashboard</h1>
          <p className="text-gray-300 mt-3 max-w-2xl">Manage your restaurant's menu, orders, and media from one place.</p>
        </div>
      </div>

      <StoreStatusCard />

      <StoreClosurePanel />

      <OrderCutoffSettings />

      <BusinessHoursSettings />

      <BroadcastPushCard />
      <PushLogList />

      {/* Store metrics — daily volume, revenue, breakdowns */}
      <StoreMetrics />

      {/* Live Orders Feed */}
      <LiveOrdersFeed />

      {/* Orders section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Receipt size={20} className="text-midnight-cherry" />
          <h2 className="font-heading text-xl text-obsidian-roast">Orders</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Track and manage every order across all channels.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {orderPages.map((page) =>
          <Link
            key={page.path}
            to={page.path}
            className="card-diner p-6 group hover:shadow-float-lg transition-all">
            
              <div className={`w-12 h-12 bg-${page.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <page.icon size={24} className="text-white" />
              </div>
              <h2 className="font-heading text-lg text-obsidian-roast mb-2 group-hover:text-midnight-cherry transition-colors">{page.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{page.description}</p>
              <span className="inline-flex items-center text-sm font-heading text-midnight-cherry group-hover:gap-2 transition-all gap-1">
                Open →
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Other Admin Pages Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="font-heading text-xl text-obsidian-roast mb-6">Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {adminPages.map((page) =>
          <Link
            key={page.path}
            to={page.path}
            className="card-diner p-6 group hover:shadow-float-lg transition-all">
            
              <div className={`w-12 h-12 bg-${page.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <page.icon size={24} className="text-white" />
              </div>
              <h2 className="font-heading text-lg text-obsidian-roast mb-2 group-hover:text-midnight-cherry transition-colors">{page.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{page.description}</p>
              <span className="inline-flex items-center text-sm font-heading text-midnight-cherry group-hover:gap-2 transition-all gap-1">
                Open →
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>);

}